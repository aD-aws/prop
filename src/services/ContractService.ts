import { 
  Contract, 
  ContractGenerationRequest, 
  ContractGenerationResult, 
  ContractGenerationPreferences,
  ContractTerms,
  ContractPaymentSchedule,
  ContractTimeline,
  ContractWarranty,
  ContractSignature,
  DigitalSignatureRequest,
  DigitalSignatureResponse,
  SignatureVerificationResult,
  ContractStatus,
  LegalCompliance,
  ConsumerProtectionTerms,
  DisputeResolutionTerms,
  ContractMilestone,
  ContractVariation,
  ContractPayment,
  Quote,
  ScopeOfWork,
  Project,
  User
} from '../types';
import { ContractModel } from '../models/Contract';
import { QuoteService } from './QuoteService';
import { SoWGenerationService } from './SoWGenerationService';
import { ProjectService } from './ProjectService';
import { UserService } from './UserService';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export class ContractService {
  /**
   * Generate a contract from a selected quote
   */
  static async generateContract(request: ContractGenerationRequest): Promise<ContractGenerationResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];
    let legalReviewRequired = false;

    try {
      // Validate inputs
      const validationResult = await this.validateGenerationRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          generationTime: Date.now() - startTime,
          warnings,
          errors: validationResult.errors,
          legalReviewRequired: false,
          complianceIssues: [],
          recommendations: []
        };
      }

      // Get required data
      const quoteService = new QuoteService();
      const sowService = new SoWGenerationService();
      const projectService = new ProjectService();
      const userService = new UserService();

      const [quoteResponse, sow, project, homeowner, builder] = await Promise.all([
        quoteService.getQuote(request.quoteId),
        sowService.getScopeOfWork(request.sowId),
        projectService.getProjectById(request.projectId),
        userService.getUserById(request.homeownerId),
        userService.getUserById(request.builderId)
      ]);

      const quote = quoteResponse.success ? quoteResponse.data : null;

      if (!quote || !sow || !project || !homeowner || !builder) {
        errors.push('Required data not found');
        return {
          success: false,
          generationTime: Date.now() - startTime,
          warnings,
          errors,
          legalReviewRequired: false,
          complianceIssues: [],
          recommendations: []
        };
      }

      // Generate contract terms
      const contractTerms = await this.generateContractTerms(quote, sow, project, request.preferences, request.customTerms);
      
      // Check legal compliance
      const legalCompliance = await this.checkLegalCompliance(contractTerms, project);
      if (!legalCompliance.ukConstructionLaw || !legalCompliance.consumerRights) {
        legalReviewRequired = true;
        warnings.push('Legal review required due to compliance issues');
      }

      // Generate consumer protection terms
      const consumerProtection = this.generateConsumerProtectionTerms(contractTerms, project);

      // Generate dispute resolution terms
      const disputeResolution = this.generateDisputeResolutionTerms(request.preferences);

      // Create contract milestones from SoW phases
      const milestones = this.generateMilestonesFromSoW(sow, quote);

      // Generate contract number
      const contractNumber = ContractModel.generateContractNumber(request.projectId);

      // Create contract
      const contract: Omit<Contract, 'PK' | 'SK' | 'id' | 'createdAt' | 'updatedAt' | 'GSI7PK' | 'GSI7SK' | 'GSI8PK' | 'GSI8SK'> = {
        projectId: request.projectId,
        sowId: request.sowId,
        quoteId: request.quoteId,
        homeownerId: request.homeownerId,
        builderId: request.builderId,
        contractNumber,
        version: 1,
        status: 'draft',
        terms: contractTerms,
        signatures: this.generateSignatureRequirements(homeowner, builder),
        milestones,
        variations: [],
        payments: [],
        documents: [],
        legalCompliance,
        consumerProtection,
        disputeResolution
      };

      const createdContract = await ContractModel.create(contract);

      // Generate recommendations
      const recommendations = this.generateRecommendations(createdContract, quote, sow);

      logger.info(`Contract generated successfully: ${createdContract.id}`);

      return {
        success: true,
        contractId: createdContract.id,
        contract: createdContract,
        generationTime: Date.now() - startTime,
        warnings,
        errors,
        legalReviewRequired,
        complianceIssues: legalCompliance.complianceNotes,
        recommendations
      };

    } catch (error) {
      logger.error('Error generating contract:', error);
      return {
        success: false,
        generationTime: Date.now() - startTime,
        warnings,
        errors: ['Failed to generate contract'],
        legalReviewRequired: false,
        complianceIssues: [],
        recommendations: []
      };
    }
  }

  /**
   * Get contract by ID
   */
  static async getById(contractId: string): Promise<Contract | null> {
    return await ContractModel.getById(contractId);
  }

  /**
   * Update contract status
   */
  static async updateStatus(contractId: string, status: ContractStatus, updatedBy: string, reason?: string): Promise<Contract> {
    const contract = await ContractModel.update(contractId, { status }, updatedBy);
    
    // Handle status-specific logic
    switch (status) {
      case 'active':
        // Contract is now active, update project status
        const projectService = new ProjectService();
        await projectService.updateProjectStatus(contract.projectId, 'active');
        break;
      case 'completed':
        // Contract completed, update project status
        const projectService2 = new ProjectService();
        await projectService2.updateProjectStatus(contract.projectId, 'completed');
        break;
      case 'terminated':
        // Handle termination logic
        await this.handleContractTermination(contract, reason || 'No reason provided', updatedBy);
        break;
    }

    return contract;
  }

  /**
   * Request digital signature
   */
  static async requestDigitalSignature(request: DigitalSignatureRequest): Promise<DigitalSignatureResponse> {
    try {
      const contract = await ContractModel.getById(request.contractId);
      if (!contract) {
        return {
          success: false,
          expiryDate: '',
          verificationCode: '',
          error: 'Contract not found'
        };
      }

      // Generate signature ID and verification code
      const signatureId = uuidv4();
      const verificationCode = this.generateVerificationCode();
      const expiryDate = new Date(Date.now() + (request.expiryDays * 24 * 60 * 60 * 1000)).toISOString();

      // Create signature record
      const signature: ContractSignature = {
        id: signatureId,
        party: request.signerRole,
        signerName: request.signerName,
        signerEmail: request.signerEmail,
        signatureType: request.signatureType,
        signedAt: undefined,
        witnessRequired: request.witnessRequired,
        status: 'pending',
        verificationCode,
        legalValidity: {
          valid: false,
          checks: [],
          timestamp: new Date().toISOString(),
          auditTrail: []
        }
      };

      // Update contract with signature request
      const updatedSignatures = contract.signatures.map(sig => 
        sig.signerEmail === request.signerEmail ? signature : sig
      );

      await ContractModel.update(request.contractId, { 
        signatures: updatedSignatures,
        status: 'pending-signatures'
      }, 'system');

      // Generate signing URL (in a real implementation, this would integrate with a digital signature provider)
      const signingUrl = this.generateSigningUrl(request.contractId, signatureId, verificationCode);

      // TODO: Send email notification to signer
      // await this.sendSignatureRequest(request, signingUrl, expiryDate);

      return {
        success: true,
        signatureId,
        signingUrl,
        expiryDate,
        verificationCode
      };

    } catch (error) {
      logger.error('Error requesting digital signature:', error);
      return {
        success: false,
        expiryDate: '',
        verificationCode: '',
        error: 'Failed to request signature'
      };
    }
  }

  /**
   * Process digital signature
   */
  static async processDigitalSignature(
    contractId: string, 
    signatureId: string, 
    signatureData: string,
    verificationCode: string,
    ipAddress: string,
    userAgent: string
  ): Promise<SignatureVerificationResult> {
    try {
      const contract = await ContractModel.getById(contractId);
      if (!contract) {
        throw new Error('Contract not found');
      }

      const signature = contract.signatures.find(sig => sig.id === signatureId);
      if (!signature) {
        throw new Error('Signature not found');
      }

      // Verify signature code
      if (signature.verificationCode !== verificationCode) {
        throw new Error('Invalid verification code');
      }

      // Perform signature verification checks
      const verificationChecks = await this.performSignatureVerification(signatureData, signature);
      const isValid = verificationChecks.every(check => check.status === 'passed');

      // Update signature
      const updatedSignature: ContractSignature = {
        ...signature,
        signatureData,
        signedAt: new Date().toISOString(),
        ipAddress,
        status: isValid ? 'signed' : 'invalid',
        legalValidity: {
          valid: isValid,
          checks: verificationChecks,
          timestamp: new Date().toISOString(),
          auditTrail: [
            `Signature processed at ${new Date().toISOString()}`,
            `IP Address: ${ipAddress}`,
            `User Agent: ${userAgent}`
          ]
        }
      };

      // Update contract with signed signature
      await ContractModel.addSignature(contractId, updatedSignature, signature.signerEmail);

      return {
        valid: isValid,
        signatureId,
        verificationChecks,
        auditTrail: updatedSignature.legalValidity.auditTrail.map(entry => ({
          action: 'signature-verification',
          timestamp: new Date().toISOString(),
          ipAddress,
          userAgent,
          details: { entry }
        })),
        legalValidity: isValid,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Error processing digital signature:', error);
      throw new Error('Failed to process signature');
    }
  }

  /**
   * Add contract variation
   */
  static async addVariation(
    contractId: string, 
    variationData: Omit<ContractVariation, 'id' | 'variationNumber'>,
    requestedBy: string
  ): Promise<Contract> {
    const contract = await ContractModel.getById(contractId);
    if (!contract) {
      throw new Error('Contract not found');
    }

    const variationNumber = `VAR-${String(contract.variations.length + 1).padStart(3, '0')}`;
    
    const variation: ContractVariation = {
      ...variationData,
      id: uuidv4(),
      variationNumber
    };

    return await ContractModel.addVariation(contractId, variation, requestedBy);
  }

  /**
   * Complete milestone
   */
  static async completeMilestone(
    contractId: string, 
    milestoneId: string, 
    completedBy: string,
    notes?: string
  ): Promise<Contract> {
    const updates: Partial<ContractMilestone> = {
      status: 'completed',
      actualDate: new Date().toISOString(),
      approvedBy: completedBy,
      approvedAt: new Date().toISOString(),
      notes
    };

    return await ContractModel.updateMilestone(contractId, milestoneId, updates, completedBy);
  }

  /**
   * Record payment
   */
  static async recordPayment(
    contractId: string,
    paymentData: Omit<ContractPayment, 'id'>,
    recordedBy: string
  ): Promise<Contract> {
    const payment: ContractPayment = {
      ...paymentData,
      id: uuidv4()
    };

    return await ContractModel.recordPayment(contractId, payment, recordedBy);
  }

  /**
   * Get contracts by homeowner
   */
  static async getByHomeownerId(homeownerId: string, status?: ContractStatus): Promise<Contract[]> {
    return await ContractModel.getByHomeownerId(homeownerId, status);
  }

  /**
   * Get contracts by builder
   */
  static async getByBuilderId(builderId: string, status?: ContractStatus): Promise<Contract[]> {
    return await ContractModel.getByBuilderId(builderId, status);
  }

  /**
   * Get contract statistics
   */
  static async getStatistics(userId: string, userType: 'homeowner' | 'builder') {
    return await ContractModel.getStatistics(userId, userType);
  }

  /**
   * Validate contract generation request
   */
  private static async validateGenerationRequest(request: ContractGenerationRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    if (!request.projectId) errors.push('Project ID is required');
    if (!request.sowId) errors.push('SoW ID is required');
    if (!request.quoteId) errors.push('Quote ID is required');
    if (!request.homeownerId) errors.push('Homeowner ID is required');
    if (!request.builderId) errors.push('Builder ID is required');

    // Validate that quote is selected and approved
    if (request.quoteId) {
      const quoteService = new QuoteService();
      const quoteResponse = await quoteService.getQuote(request.quoteId);
      const quote = quoteResponse.success ? quoteResponse.data : null;
      if (!quote || quote.status !== 'selected') {
        errors.push('Quote must be selected before generating contract');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate contract terms from quote and SoW
   */
  private static async generateContractTerms(
    quote: Quote, 
    sow: ScopeOfWork, 
    project: Project,
    preferences: ContractGenerationPreferences,
    customTerms?: any
  ): Promise<ContractTerms> {
    // Generate payment schedule
    const paymentSchedule = this.generatePaymentSchedule(quote, preferences);
    
    // Generate timeline
    const timeline = this.generateContractTimeline(quote, sow);
    
    // Generate warranty terms
    const warranty = this.generateWarrantyTerms(quote, preferences);

    return {
      workDescription: sow.specifications.map(spec => spec.description).join('\n\n'),
      totalValue: quote.totalPrice,
      currency: 'GBP',
      paymentSchedule,
      timeline,
      warranty,
      variations: {
        allowedTypes: ['additional-work', 'material-change', 'design-change'],
        approvalProcess: 'Written approval required from both parties',
        pricingMethod: 'quotation',
        timeExtensions: true,
        documentationRequired: ['variation-order', 'cost-breakdown', 'time-impact-assessment'],
        disputeResolution: 'Mediation followed by arbitration',
        maximumValue: quote.totalPrice * (preferences.variationAllowance / 100)
      },
      termination: {
        terminationRights: [
          {
            party: 'either',
            reason: 'Material breach with 14 days notice',
            noticePeriod: 14,
            consequences: 'Payment for work completed to date'
          },
          {
            party: 'homeowner',
            reason: 'Convenience',
            noticePeriod: 7,
            consequences: 'Payment for work completed plus reasonable costs'
          }
        ],
        noticePeriods: [
          {
            reason: 'Material breach',
            period: 14,
            method: ['written-notice', 'email'],
            consequences: 'Contract termination if not remedied'
          }
        ],
        paymentOnTermination: 'Payment for work completed to date',
        materialOwnership: 'Materials on site become property of homeowner upon payment',
        workInProgress: 'To be completed to a safe stopping point',
        subcontractorTermination: 'Builder responsible for terminating subcontracts',
        disputeResolution: 'As per main dispute resolution clause'
      },
      insurance: {
        publicLiability: {
          required: true,
          minimumCover: 2000000,
          currency: 'GBP',
          validityPeriod: 'Duration of works plus 6 months',
          specificCoverage: ['third-party-injury', 'property-damage'],
          exclusions: ['professional-negligence']
        },
        employersLiability: {
          required: true,
          minimumCover: 10000000,
          currency: 'GBP',
          validityPeriod: 'Duration of works',
          specificCoverage: ['employee-injury', 'employee-illness'],
          exclusions: []
        },
        contractWorks: {
          required: quote.totalPrice > 50000,
          minimumCover: quote.totalPrice,
          currency: 'GBP',
          validityPeriod: 'Duration of works',
          specificCoverage: ['works-damage', 'materials-damage'],
          exclusions: ['design-defects']
        },
        evidenceRequired: ['insurance-certificates', 'policy-schedules'],
        renewalNotification: true,
        additionalInsured: true
      },
      healthSafety: {
        cdmCompliance: true,
        riskAssessments: ['site-specific-risk-assessment', 'method-statements'],
        methodStatements: ['excavation', 'working-at-height', 'electrical-work'],
        competentPersons: ['site-supervisor', 'safety-officer'],
        trainingRequirements: ['health-safety-awareness', 'first-aid'],
        reportingProcedures: 'All accidents and near-misses to be reported within 24 hours',
        emergencyProcedures: 'Emergency contact details and procedures to be displayed on site',
        inspectionSchedule: 'Weekly safety inspections by competent person',
        documentationRequired: ['risk-assessments', 'method-statements', 'training-records']
      },
      qualityStandards: {
        applicableStandards: ['BS-8000', 'NHBC-Standards', 'Building-Regulations'],
        inspectionSchedule: {
          stages: ['foundation', 'frame', 'weatherproof', 'first-fix', 'second-fix', 'completion'],
          inspector: preferences.template === 'detailed' ? 'third-party' : 'client',
          noticePeriod: 48,
          failureConsequences: 'Work to be rectified before proceeding',
          reinspectionProcess: 'Re-inspection required after rectification',
          costs: 'Builder responsible for rectification costs'
        },
        testingRequirements: [
          {
            test: 'Electrical Installation Certificate',
            standard: 'BS-7671',
            frequency: 'On completion',
            responsibility: 'builder',
            costs: 'Included in contract price',
            failureProcess: 'Rectification required before handover',
            certification: true
          }
        ],
        nonConformanceProcess: 'Written notice with 7 days to rectify',
        remedialWorkProcess: 'At builder expense unless due to client variation',
        qualityAssurance: 'Builder to maintain quality control procedures',
        certificationRequired: ['electrical-certificates', 'gas-certificates', 'building-control-certificates']
      },
      materials: {
        specificationCompliance: true,
        approvalProcess: 'Samples to be approved before ordering',
        substitutionPolicy: 'No substitutions without written approval',
        qualityStandards: ['CE-marking', 'British-Standards', 'manufacturer-warranties'],
        deliveryResponsibility: 'Builder responsible for delivery and storage',
        storageRequirements: 'Materials to be stored in accordance with manufacturer instructions',
        wasteDisposal: 'Builder responsible for waste disposal in accordance with regulations',
        sustainabilityRequirements: ['FSC-certified-timber', 'low-VOC-materials'],
        certificationRequired: ['material-certificates', 'test-certificates']
      },
      subcontracting: {
        allowed: true,
        approvalRequired: true,
        approvalProcess: 'Written approval required for all subcontractors',
        liabilityTerms: 'Builder remains fully liable for subcontractor work',
        paymentResponsibility: 'Builder responsible for subcontractor payments',
        qualificationRequirements: ['relevant-qualifications', 'insurance', 'references'],
        insuranceRequirements: ['public-liability', 'employers-liability'],
        directPaymentRights: false
      },
      intellectualProperty: {
        designOwnership: 'Designs remain property of originator',
        licenseGrants: 'License granted for construction purposes only',
        modifications: 'No modifications without written consent',
        thirdPartyRights: 'Respect for third-party intellectual property',
        confidentialInformation: 'Confidential information to be protected',
        useRestrictions: ['no-commercial-use', 'no-reproduction']
      },
      confidentiality: {
        scope: 'All project information and personal data',
        duration: '5 years from contract completion',
        exceptions: ['publicly-available-information', 'legal-requirements'],
        returnRequirements: 'Return or destroy confidential information on request',
        breachConsequences: 'Damages and injunctive relief',
        survivability: true
      },
      forceMajeure: {
        definition: 'Events beyond reasonable control of either party',
        events: ['natural-disasters', 'government-restrictions', 'pandemic', 'war', 'terrorism'],
        notificationRequirements: 'Written notice within 7 days of event',
        mitigationObligations: 'Reasonable efforts to mitigate impact',
        suspensionRights: 'Right to suspend performance during event',
        terminationRights: 'Right to terminate if event continues for more than 3 months',
        costAllocation: 'Each party bears own costs during force majeure'
      },
      additionalTerms: customTerms?.additionalClauses || []
    };
  }

  /**
   * Generate payment schedule
   */
  private static generatePaymentSchedule(quote: Quote, preferences: ContractGenerationPreferences): ContractPaymentSchedule {
    const totalAmount = quote.totalPrice;
    const retentionPercentage = preferences.retentionPercentage;
    const retentionAmount = totalAmount * (retentionPercentage / 100);

    let schedule: any[] = [];

    switch (preferences.paymentScheduleType) {
      case 'milestone':
        schedule = [
          {
            milestone: 'Contract signing',
            percentage: 10,
            amount: totalAmount * 0.1,
            trigger: 'Contract execution',
            requiredDocuments: ['signed-contract'],
            inspectionRequired: false
          },
          {
            milestone: 'Commencement',
            percentage: 15,
            amount: totalAmount * 0.15,
            trigger: 'Work commencement on site',
            requiredDocuments: ['commencement-notice'],
            inspectionRequired: false
          },
          {
            milestone: 'Foundation completion',
            percentage: 20,
            amount: totalAmount * 0.2,
            trigger: 'Foundation work completed and approved',
            requiredDocuments: ['foundation-certificate'],
            inspectionRequired: true
          },
          {
            milestone: 'Weatherproof stage',
            percentage: 25,
            amount: totalAmount * 0.25,
            trigger: 'Building weatherproof',
            requiredDocuments: ['weatherproof-certificate'],
            inspectionRequired: true
          },
          {
            milestone: 'First fix completion',
            percentage: 15,
            amount: totalAmount * 0.15,
            trigger: 'First fix work completed',
            requiredDocuments: ['first-fix-certificate'],
            inspectionRequired: true
          },
          {
            milestone: 'Practical completion',
            percentage: 15 - retentionPercentage,
            amount: totalAmount * (0.15 - retentionPercentage / 100),
            trigger: 'Practical completion achieved',
            requiredDocuments: ['completion-certificate', 'warranties'],
            inspectionRequired: true
          }
        ];
        break;

      case 'stage':
        // Similar to milestone but based on RIBA stages
        schedule = quote.timeline.phases.map((phase, index) => ({
          milestone: phase.name,
          percentage: 100 / quote.timeline.phases.length,
          amount: totalAmount / quote.timeline.phases.length,
          trigger: `Completion of ${phase.name}`,
          requiredDocuments: [`${phase.name.toLowerCase()}-certificate`],
          inspectionRequired: true
        }));
        break;

      case 'monthly':
        const months = Math.ceil(quote.timeline.totalDuration / 30);
        const monthlyAmount = totalAmount / months;
        schedule = Array.from({ length: months }, (_, index) => ({
          milestone: `Month ${index + 1}`,
          percentage: 100 / months,
          amount: monthlyAmount,
          trigger: `End of month ${index + 1}`,
          requiredDocuments: ['progress-report'],
          inspectionRequired: false
        }));
        break;
    }

    return {
      type: preferences.paymentScheduleType,
      totalAmount,
      currency: 'GBP',
      schedule: schedule.map(item => ({
        ...item,
        id: uuidv4(),
        status: 'pending' as const
      })),
      retentionPercentage,
      retentionAmount,
      retentionReleaseTerms: 'Released 12 months after practical completion or upon rectification of defects',
      paymentTerms: 14, // 14 days payment terms
      lateFees: {
        enabled: true,
        type: 'percentage',
        rate: 8, // 8% per annum
        gracePeriod: 7,
        compounding: false
      }
    };
  }

  /**
   * Generate contract timeline
   */
  private static generateContractTimeline(quote: Quote, sow: ScopeOfWork): ContractTimeline {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14); // Start 2 weeks from now
    
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + quote.timeline.totalDuration);

    return {
      startDate: startDate.toISOString(),
      completionDate: completionDate.toISOString(),
      totalDuration: quote.timeline.totalDuration,
      phases: quote.timeline.phases.map(phase => ({
        id: uuidv4(),
        name: phase.name,
        description: phase.description,
        startDate: new Date(startDate.getTime() + (phase.startDay * 24 * 60 * 60 * 1000)).toISOString(),
        endDate: new Date(startDate.getTime() + ((phase.startDay + phase.duration) * 24 * 60 * 60 * 1000)).toISOString(),
        duration: phase.duration,
        dependencies: phase.dependencies,
        deliverables: phase.deliverables,
        paymentTrigger: true,
        criticalPath: true
      })),
      keyDates: [
        {
          id: uuidv4(),
          description: 'Contract commencement',
          date: startDate.toISOString(),
          type: 'start',
          critical: true,
          consequences: 'Delay penalties may apply'
        },
        {
          id: uuidv4(),
          description: 'Practical completion',
          date: completionDate.toISOString(),
          type: 'completion',
          critical: true,
          consequences: 'Final payment due'
        }
      ],
      delayPenalties: {
        enabled: true,
        type: 'daily',
        rate: quote.totalPrice * 0.001, // 0.1% per day
        threshold: 7, // Grace period of 7 days
        maximum: quote.totalPrice * 0.1, // Maximum 10% of contract value
        exclusions: ['force-majeure', 'client-variations', 'weather-delays'],
        liquidatedDamages: true
      },
      extensionTerms: {
        allowedReasons: ['variations', 'unforeseen-conditions', 'weather', 'force-majeure'],
        notificationPeriod: 7,
        documentationRequired: ['extension-request', 'supporting-evidence'],
        approvalProcess: 'Written approval required within 14 days',
        costImplications: 'Additional costs to be agreed separately'
      },
      weatherAllowances: {
        enabled: true,
        allowedDays: Math.ceil(quote.timeline.totalDuration * 0.1), // 10% weather allowance
        conditions: ['rain-preventing-external-work', 'frost', 'high-winds'],
        measurementMethod: 'Local weather station data',
        disputeResolution: 'Expert determination by weather consultant'
      }
    };
  }

  /**
   * Generate warranty terms
   */
  private static generateWarrantyTerms(quote: Quote, preferences: ContractGenerationPreferences): ContractWarranty {
    return {
      workmanship: {
        duration: preferences.warrantyPeriod,
        unit: 'months',
        coverage: 'All workmanship defects',
        startDate: 'completion',
        limitations: ['fair-wear-and-tear', 'misuse', 'lack-of-maintenance'],
        claimsProcess: 'Written notice to builder with reasonable access for inspection',
        remedyOptions: ['repair', 'replacement', 'compensation']
      },
      materials: {
        duration: Math.max(preferences.warrantyPeriod, 12),
        unit: 'months',
        coverage: 'Material defects not covered by manufacturer warranty',
        startDate: 'completion',
        limitations: ['manufacturer-warranty-exclusions', 'misuse'],
        claimsProcess: 'Written notice with evidence of defect',
        remedyOptions: ['repair', 'replacement']
      },
      structural: quote.totalPrice > 100000 ? {
        duration: 120, // 10 years for structural work
        unit: 'months',
        coverage: 'Structural defects affecting stability',
        startDate: 'completion',
        limitations: ['design-defects', 'ground-conditions'],
        claimsProcess: 'Written notice with structural engineer report',
        remedyOptions: ['repair', 'compensation']
      } : undefined,
      defectsLiability: {
        period: 12,
        coverage: 'All defects notified during defects liability period',
        responseTime: 7,
        remedyTimeframe: 30,
        costResponsibility: 'Builder at no cost to homeowner',
        emergencyProcedures: '24-hour response for emergency defects'
      },
      maintenanceRequirements: [
        {
          item: 'Gutters and downpipes',
          frequency: 'Annually',
          responsibility: 'homeowner',
          instructions: 'Clear debris and check for blockages',
          warrantyImpact: 'Failure to maintain may void warranty'
        }
      ],
      exclusions: [
        'Normal wear and tear',
        'Damage due to misuse or neglect',
        'Damage due to alterations by others',
        'Damage due to failure to maintain'
      ],
      transferability: true
    };
  }

  /**
   * Check legal compliance
   */
  private static async checkLegalCompliance(terms: ContractTerms, project: Project): Promise<LegalCompliance> {
    // This would integrate with legal compliance checking service
    // For now, return basic compliance check
    return {
      ukConstructionLaw: true,
      consumerRights: true,
      unfairTermsRegulations: true,
      constructionAct1996: true,
      cdmRegulations: terms.healthSafety.cdmCompliance,
      buildingRegulations: true,
      planningPermission: project.councilData.planningRestrictions.length === 0,
      dataProtection: true,
      healthSafety: terms.healthSafety.cdmCompliance,
      environmentalRegulations: true,
      complianceCheckedAt: new Date().toISOString(),
      complianceNotes: []
    };
  }

  /**
   * Generate consumer protection terms
   */
  private static generateConsumerProtectionTerms(terms: ContractTerms, project: Project): ConsumerProtectionTerms {
    return {
      coolingOffPeriod: {
        applicable: true,
        duration: 14,
        startDate: 'contract-signing',
        exclusions: ['emergency-works'],
        cancellationProcess: 'Written notice within cooling-off period',
        refundTerms: 'Full refund minus reasonable costs incurred'
      },
      rightToCancel: {
        grounds: ['material-breach', 'unsatisfactory-work', 'safety-concerns'],
        noticePeriod: 14,
        process: 'Written notice with reasons',
        consequences: 'Contract termination and refund of payments less work completed',
        refundRights: 'Refund of payments for uncompleted work',
        workStoppageRights: 'Right to stop work immediately for safety reasons'
      },
      unfairTermsProtection: true,
      disputeResolution: {
        internalProcess: 'Direct negotiation between parties',
        mediationRights: true,
        arbitrationRights: true,
        courtRights: true,
        ombudsmanRights: true,
        legalAidRights: true,
        costsProtection: 'Reasonable costs protection for consumers'
      },
      informationRequirements: [
        {
          requirement: 'Written contract with all terms',
          provided: true,
          method: 'Physical and electronic copy',
          timing: 'Before work commencement',
          consequences: 'Right to cancel if not provided'
        }
      ],
      guaranteeRights: {
        statutoryRights: ['Consumer Rights Act 2015', 'Supply of Goods and Services Act 1982'],
        contractualRights: ['Workmanship warranty', 'Materials warranty'],
        insuranceRights: ['Public liability coverage', 'Professional indemnity'],
        transferRights: true,
        enforcementRights: 'Court enforcement available'
      },
      remedyRights: {
        defectiveWork: ['repair', 'replacement', 'price-reduction', 'rejection'],
        delayedCompletion: ['price-reduction', 'damages', 'termination'],
        breachOfContract: ['damages', 'specific-performance', 'termination'],
        unsatisfactoryWork: ['rectification', 'price-reduction', 'rejection'],
        costOverruns: ['explanation', 'approval', 'dispute-resolution'],
        safetyIssues: ['immediate-rectification', 'work-stoppage', 'termination']
      }
    };
  }

  /**
   * Generate dispute resolution terms
   */
  private static generateDisputeResolutionTerms(preferences: ContractGenerationPreferences): DisputeResolutionTerms {
    return {
      negotiation: {
        mandatory: true,
        timeframe: 30,
        process: 'Direct negotiation between authorized representatives',
        representatives: 'Senior management or designated representatives',
        confidentiality: true,
        goodFaith: true
      },
      mediation: {
        mandatory: preferences.disputeResolution === 'mediation' || preferences.disputeResolution === 'all',
        provider: 'Centre for Effective Dispute Resolution (CEDR)',
        timeframe: 60,
        costs: 'Shared equally between parties',
        binding: false,
        confidentiality: true
      },
      arbitration: {
        mandatory: preferences.disputeResolution === 'arbitration' || preferences.disputeResolution === 'all',
        rules: 'ICC Arbitration Rules',
        seat: 'London, England',
        language: 'English',
        arbitrators: 1,
        costs: 'As determined by arbitrator',
        appeals: false,
        enforcement: 'New York Convention'
      },
      litigation: {
        jurisdiction: 'England and Wales',
        courts: 'High Court of Justice',
        governingLaw: 'English Law',
        serviceOfProcess: 'As per Civil Procedure Rules',
        costs: 'As determined by court',
        appeals: true
      },
      expertDetermination: {
        applicable: true,
        scope: ['technical-disputes', 'valuation-disputes'],
        expert: 'Chartered surveyor or relevant professional',
        timeframe: 30,
        costs: 'Shared equally',
        binding: true,
        appeals: false
      },
      adjudication: {
        applicable: true,
        scheme: 'Construction Act 1996 Scheme',
        timeframe: 28,
        costs: 'As determined by adjudicator',
        binding: true,
        enforcement: 'Court enforcement available'
      },
      escalationProcess: [
        'Direct negotiation (30 days)',
        'Mediation (60 days)',
        'Arbitration or litigation'
      ],
      costsAllocation: 'Loser pays principle with court discretion',
      interimMeasures: 'Available through arbitration or court'
    };
  }

  /**
   * Generate milestones from SoW
   */
  private static generateMilestonesFromSoW(sow: ScopeOfWork, quote: Quote): ContractMilestone[] {
    return sow.ribaStages.map((stage, index) => ({
      id: uuidv4(),
      name: `RIBA Stage ${stage.stage}: ${stage.title}`,
      description: stage.description,
      targetDate: new Date(Date.now() + ((index + 1) * 30 * 24 * 60 * 60 * 1000)).toISOString(), // Monthly milestones
      status: 'pending' as const,
      dependencies: stage.dependencies,
      deliverables: stage.deliverables,
      paymentTrigger: true,
      inspectionRequired: true,
      approvalRequired: true
    }));
  }

  /**
   * Generate signature requirements
   */
  private static generateSignatureRequirements(homeowner: User, builder: User): ContractSignature[] {
    return [
      {
        id: uuidv4(),
        party: 'homeowner',
        signerName: `${homeowner.profile.firstName} ${homeowner.profile.lastName}`,
        signerEmail: homeowner.email,
        signatureType: 'electronic',
        witnessRequired: false,
        status: 'pending',
        legalValidity: {
          valid: false,
          checks: [],
          timestamp: new Date().toISOString(),
          auditTrail: []
        }
      },
      {
        id: uuidv4(),
        party: 'builder',
        signerName: builder.profile.companyName || `${builder.profile.firstName} ${builder.profile.lastName}`,
        signerEmail: builder.email,
        signatureType: 'electronic',
        witnessRequired: false,
        status: 'pending',
        legalValidity: {
          valid: false,
          checks: [],
          timestamp: new Date().toISOString(),
          auditTrail: []
        }
      }
    ];
  }

  /**
   * Generate verification code
   */
  private static generateVerificationCode(): string {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  /**
   * Generate signing URL
   */
  private static generateSigningUrl(contractId: string, signatureId: string, verificationCode: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'https://app.example.com';
    return `${baseUrl}/contracts/${contractId}/sign/${signatureId}?code=${verificationCode}`;
  }

  /**
   * Perform signature verification
   */
  private static async performSignatureVerification(signatureData: string, signature: ContractSignature) {
    // This would integrate with digital signature verification service
    // For now, return basic checks
    return [
      {
        type: 'identity' as const,
        status: 'passed' as const,
        details: 'Signer identity verified',
        timestamp: new Date().toISOString()
      },
      {
        type: 'integrity' as const,
        status: 'passed' as const,
        details: 'Signature integrity verified',
        timestamp: new Date().toISOString()
      },
      {
        type: 'timestamp' as const,
        status: 'passed' as const,
        details: 'Timestamp verified',
        timestamp: new Date().toISOString()
      }
    ];
  }

  /**
   * Handle contract termination
   */
  private static async handleContractTermination(contract: Contract, reason: string, terminatedBy: string): Promise<void> {
    // Update project status
    const projectService = new ProjectService();
    await projectService.updateProjectStatus(contract.projectId, 'cancelled');
    
    // TODO: Handle payments, refunds, etc.
    // TODO: Notify relevant parties
    // TODO: Generate termination documentation
    
    logger.info(`Contract ${contract.id} terminated: ${reason}`);
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(contract: Contract, quote: Quote, sow: ScopeOfWork): string[] {
    const recommendations: string[] = [];

    if (contract.terms.totalValue > 100000) {
      recommendations.push('Consider professional legal review due to high contract value');
    }

    if (contract.terms.timeline.totalDuration > 180) {
      recommendations.push('Consider milestone-based payments for long-duration projects');
    }

    if (!contract.terms.insurance.contractWorks?.required) {
      recommendations.push('Consider contract works insurance for additional protection');
    }

    recommendations.push('Ensure all parties understand their obligations before signing');
    recommendations.push('Keep all contract documents and correspondence for your records');

    return recommendations;
  }
}