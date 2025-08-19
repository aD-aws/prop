import { 
  Contract, 
  ContractStatus, 
  ContractSignature, 
  ContractMilestone, 
  ContractVariation, 
  ContractPayment 
} from '../../types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn()
}));

const mockSend = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend
    }))
  },
  PutCommand: jest.fn(),
  GetCommand: jest.fn(),
  UpdateCommand: jest.fn(),
  QueryCommand: jest.fn(),
  DeleteCommand: jest.fn()
}));

// Import after mocking
import { ContractModel } from '../../models/Contract';

describe('ContractModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockContractData = {
    projectId: 'project-123',
    sowId: 'sow-123',
    quoteId: 'quote-123',
    homeownerId: 'homeowner-123',
    builderId: 'builder-123',
    contractNumber: 'CON-202401-PROJECT1-001',
    version: 1,
    status: 'draft' as ContractStatus,
    terms: {
      workDescription: 'Test work description',
      totalValue: 50000,
      currency: 'GBP' as const,
      paymentSchedule: {
        type: 'milestone' as const,
        totalAmount: 50000,
        currency: 'GBP' as const,
        schedule: [],
        retentionPercentage: 5,
        retentionAmount: 2500,
        retentionReleaseTerms: 'Released after 12 months',
        paymentTerms: 14,
        lateFees: {
          enabled: true,
          type: 'percentage' as const,
          rate: 8,
          gracePeriod: 7,
          compounding: false
        }
      },
      timeline: {
        startDate: '2024-02-01T00:00:00.000Z',
        completionDate: '2024-05-01T00:00:00.000Z',
        totalDuration: 90,
        phases: [],
        keyDates: [],
        delayPenalties: {
          enabled: true,
          type: 'daily' as const,
          rate: 500,
          threshold: 7,
          exclusions: [],
          liquidatedDamages: true
        },
        extensionTerms: {
          allowedReasons: ['variations'],
          notificationPeriod: 7,
          documentationRequired: ['extension-request'],
          approvalProcess: 'Written approval required',
          costImplications: 'Additional costs to be agreed'
        },
        weatherAllowances: {
          enabled: true,
          allowedDays: 9,
          conditions: ['rain'],
          measurementMethod: 'Weather station data',
          disputeResolution: 'Expert determination'
        }
      },
      warranty: {
        workmanship: {
          duration: 12,
          unit: 'months' as const,
          coverage: 'All workmanship defects',
          startDate: 'completion' as const,
          limitations: ['fair-wear-and-tear'],
          claimsProcess: 'Written notice required',
          remedyOptions: ['repair', 'replacement']
        },
        materials: {
          duration: 12,
          unit: 'months' as const,
          coverage: 'Material defects',
          startDate: 'completion' as const,
          limitations: ['misuse'],
          claimsProcess: 'Written notice required',
          remedyOptions: ['repair', 'replacement']
        },
        defectsLiability: {
          period: 12,
          coverage: 'All defects',
          responseTime: 7,
          remedyTimeframe: 30,
          costResponsibility: 'Builder',
          emergencyProcedures: '24-hour response'
        },
        maintenanceRequirements: [],
        exclusions: ['normal wear and tear'],
        transferability: true
      },
      variations: {
        allowedTypes: ['additional-work'],
        approvalProcess: 'Written approval required',
        pricingMethod: 'quotation' as const,
        timeExtensions: true,
        documentationRequired: ['variation-order'],
        disputeResolution: 'Mediation',
        maximumValue: 5000
      },
      termination: {
        terminationRights: [],
        noticePeriods: [],
        paymentOnTermination: 'Payment for work completed',
        materialOwnership: 'Materials become homeowner property',
        workInProgress: 'Complete to safe stopping point',
        subcontractorTermination: 'Builder responsible',
        disputeResolution: 'As per main clause'
      },
      insurance: {
        publicLiability: {
          required: true,
          minimumCover: 2000000,
          currency: 'GBP' as const,
          validityPeriod: 'Duration of works',
          specificCoverage: ['third-party-injury'],
          exclusions: []
        },
        employersLiability: {
          required: true,
          minimumCover: 10000000,
          currency: 'GBP' as const,
          validityPeriod: 'Duration of works',
          specificCoverage: ['employee-injury'],
          exclusions: []
        },
        evidenceRequired: ['certificates'],
        renewalNotification: true,
        additionalInsured: true
      },
      healthSafety: {
        cdmCompliance: true,
        riskAssessments: ['site-specific'],
        methodStatements: ['excavation'],
        competentPersons: ['site-supervisor'],
        trainingRequirements: ['health-safety-awareness'],
        reportingProcedures: 'Report within 24 hours',
        emergencyProcedures: 'Emergency contacts displayed',
        inspectionSchedule: 'Weekly inspections',
        documentationRequired: ['risk-assessments']
      },
      qualityStandards: {
        applicableStandards: ['BS-8000'],
        inspectionSchedule: {
          stages: ['foundation'],
          inspector: 'client' as const,
          noticePeriod: 48,
          failureConsequences: 'Rectification required',
          reinspectionProcess: 'Re-inspection after rectification',
          costs: 'Builder responsible'
        },
        testingRequirements: [],
        nonConformanceProcess: 'Written notice with 7 days to rectify',
        remedialWorkProcess: 'At builder expense',
        qualityAssurance: 'Quality control procedures required',
        certificationRequired: ['electrical-certificates']
      },
      materials: {
        specificationCompliance: true,
        approvalProcess: 'Samples to be approved',
        substitutionPolicy: 'No substitutions without approval',
        qualityStandards: ['CE-marking'],
        deliveryResponsibility: 'Builder responsible',
        storageRequirements: 'As per manufacturer instructions',
        wasteDisposal: 'Builder responsible',
        sustainabilityRequirements: ['FSC-certified-timber'],
        certificationRequired: ['material-certificates']
      },
      subcontracting: {
        allowed: true,
        approvalRequired: true,
        approvalProcess: 'Written approval required',
        liabilityTerms: 'Builder remains liable',
        paymentResponsibility: 'Builder responsible',
        qualificationRequirements: ['relevant-qualifications'],
        insuranceRequirements: ['public-liability'],
        directPaymentRights: false
      },
      intellectualProperty: {
        designOwnership: 'Designs remain property of originator',
        licenseGrants: 'License for construction only',
        modifications: 'No modifications without consent',
        thirdPartyRights: 'Respect third-party rights',
        confidentialInformation: 'Confidential information protected',
        useRestrictions: ['no-commercial-use']
      },
      confidentiality: {
        scope: 'All project information',
        duration: '5 years',
        exceptions: ['publicly-available'],
        returnRequirements: 'Return on request',
        breachConsequences: 'Damages and injunctive relief',
        survivability: true
      },
      forceMajeure: {
        definition: 'Events beyond reasonable control',
        events: ['natural-disasters'],
        notificationRequirements: 'Written notice within 7 days',
        mitigationObligations: 'Reasonable efforts to mitigate',
        suspensionRights: 'Right to suspend performance',
        terminationRights: 'Right to terminate after 3 months',
        costAllocation: 'Each party bears own costs'
      },
      additionalTerms: []
    },
    signatures: [],
    milestones: [],
    variations: [],
    payments: [],
    documents: [],
    legalCompliance: {
      ukConstructionLaw: true,
      consumerRights: true,
      unfairTermsRegulations: true,
      constructionAct1996: true,
      cdmRegulations: true,
      buildingRegulations: true,
      planningPermission: true,
      dataProtection: true,
      healthSafety: true,
      environmentalRegulations: true,
      complianceCheckedAt: '2024-01-15T10:00:00.000Z',
      complianceNotes: []
    },
    consumerProtection: {
      coolingOffPeriod: {
        applicable: true,
        duration: 14,
        startDate: 'contract-signing' as const,
        exclusions: [],
        cancellationProcess: 'Written notice',
        refundTerms: 'Full refund minus costs'
      },
      rightToCancel: {
        grounds: ['material-breach'],
        noticePeriod: 14,
        process: 'Written notice',
        consequences: 'Contract termination',
        refundRights: 'Refund for uncompleted work',
        workStoppageRights: 'Right to stop work'
      },
      unfairTermsProtection: true,
      disputeResolution: {
        internalProcess: 'Direct negotiation',
        mediationRights: true,
        arbitrationRights: true,
        courtRights: true,
        ombudsmanRights: true,
        legalAidRights: true,
        costsProtection: 'Reasonable costs protection'
      },
      informationRequirements: [],
      guaranteeRights: {
        statutoryRights: ['Consumer Rights Act 2015'],
        contractualRights: ['Workmanship warranty'],
        insuranceRights: ['Public liability'],
        transferRights: true,
        enforcementRights: 'Court enforcement available'
      },
      remedyRights: {
        defectiveWork: ['repair'],
        delayedCompletion: ['damages'],
        breachOfContract: ['damages'],
        unsatisfactoryWork: ['rectification'],
        costOverruns: ['explanation'],
        safetyIssues: ['immediate-rectification']
      }
    },
    disputeResolution: {
      negotiation: {
        mandatory: true,
        timeframe: 30,
        process: 'Direct negotiation',
        representatives: 'Senior management',
        confidentiality: true,
        goodFaith: true
      },
      mediation: {
        mandatory: true,
        provider: 'CEDR',
        timeframe: 60,
        costs: 'Shared equally',
        binding: false,
        confidentiality: true
      },
      arbitration: {
        mandatory: false,
        rules: 'ICC Rules',
        seat: 'London',
        language: 'English',
        arbitrators: 1,
        costs: 'As determined by arbitrator',
        appeals: false,
        enforcement: 'New York Convention'
      },
      litigation: {
        jurisdiction: 'England and Wales',
        courts: 'High Court',
        governingLaw: 'English Law',
        serviceOfProcess: 'As per CPR',
        costs: 'As determined by court',
        appeals: true
      },
      expertDetermination: {
        applicable: true,
        scope: ['technical-disputes'],
        expert: 'Chartered surveyor',
        timeframe: 30,
        costs: 'Shared equally',
        binding: true,
        appeals: false
      },
      adjudication: {
        applicable: true,
        scheme: 'Construction Act 1996',
        timeframe: 28,
        costs: 'As determined by adjudicator',
        binding: true,
        enforcement: 'Court enforcement'
      },
      escalationProcess: ['negotiation', 'mediation'],
      costsAllocation: 'Loser pays',
      interimMeasures: 'Available through arbitration'
    }
  };

  describe('create', () => {
    it('should create a new contract successfully', async () => {
      const mockContract = {
        ...mockContractData,
        PK: 'CONTRACT#contract-123',
        SK: 'METADATA',
        id: 'contract-123',
        createdAt: '2024-01-15T10:00:00.000Z',
        updatedAt: '2024-01-15T10:00:00.000Z',
        GSI7PK: 'homeowner-123',
        GSI7SK: 'draft#2024-01-15T10:00:00.000Z',
        GSI8PK: 'builder-123',
        GSI8SK: 'draft#2024-01-15T10:00:00.000Z'
      };

      mockSend.mockResolvedValueOnce({});

      const result = await ContractModel.create(mockContractData);

      expect(mockSend).toHaveBeenCalledTimes(2); // Create contract + audit entry
      expect(result).toMatchObject({
        projectId: mockContractData.projectId,
        sowId: mockContractData.sowId,
        quoteId: mockContractData.quoteId,
        homeownerId: mockContractData.homeownerId,
        builderId: mockContractData.builderId,
        status: 'draft'
      });
      expect(result.id).toBeDefined();
      expect(result.PK).toMatch(/^CONTRACT#/);
      expect(result.SK).toBe('METADATA');
    });

    it('should handle creation errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(ContractModel.create(mockContractData))
        .rejects.toThrow('Failed to create contract');
    });
  });

  describe('getById', () => {
    it('should retrieve contract by ID', async () => {
      const mockContract = {
        ...mockContractData,
        PK: 'CONTRACT#contract-123',
        SK: 'METADATA',
        id: 'contract-123'
      };

      mockSend.mockResolvedValueOnce({ Item: mockContract });

      const result = await ContractModel.getById('contract-123');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContract);
    });

    it('should return null when contract not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await ContractModel.getById('nonexistent-contract');

      expect(result).toBeNull();
    });

    it('should handle retrieval errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(ContractModel.getById('contract-123'))
        .rejects.toThrow('Failed to get contract');
    });
  });

  describe('update', () => {
    it('should update contract successfully', async () => {
      const mockExistingContract = {
        ...mockContractData,
        PK: 'CONTRACT#contract-123',
        SK: 'METADATA',
        id: 'contract-123',
        status: 'draft' as ContractStatus
      };

      const mockUpdatedContract = {
        ...mockExistingContract,
        status: 'active' as ContractStatus,
        updatedAt: '2024-01-15T11:00:00.000Z'
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockExistingContract }) // getById call
        .mockResolvedValueOnce({ Attributes: mockUpdatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.update('contract-123', { status: 'active' }, 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(3);
      expect(result.status).toBe('active');
    });

    it('should handle update errors', async () => {
      mockSend
        .mockResolvedValueOnce({ Item: mockContractData }) // getById call
        .mockRejectedValueOnce(new Error('DynamoDB error')); // update call

      await expect(ContractModel.update('contract-123', { status: 'active' }, 'user-123'))
        .rejects.toThrow('Failed to update contract');
    });
  });

  describe('getByHomeownerId', () => {
    it('should retrieve contracts by homeowner ID', async () => {
      const mockContracts = [
        { ...mockContractData, id: 'contract-1' },
        { ...mockContractData, id: 'contract-2' }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const result = await ContractModel.getByHomeownerId('homeowner-123');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContracts);
    });

    it('should filter by status when provided', async () => {
      const mockContracts = [
        { ...mockContractData, id: 'contract-1', status: 'active' }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const result = await ContractModel.getByHomeownerId('homeowner-123', 'active');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContracts);
    });
  });

  describe('getByBuilderId', () => {
    it('should retrieve contracts by builder ID', async () => {
      const mockContracts = [
        { ...mockContractData, id: 'contract-1' },
        { ...mockContractData, id: 'contract-2' }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const result = await ContractModel.getByBuilderId('builder-123');

      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockContracts);
    });
  });

  describe('addSignature', () => {
    it('should add signature to contract', async () => {
      const mockContract = {
        ...mockContractData,
        id: 'contract-123',
        signatures: []
      };

      const mockSignature: ContractSignature = {
        id: 'signature-123',
        party: 'homeowner',
        signerName: 'John Doe',
        signerEmail: 'john@example.com',
        signatureType: 'electronic',
        witnessRequired: false,
        status: 'signed',
        legalValidity: {
          valid: true,
          checks: [],
          timestamp: '2024-01-15T10:00:00.000Z',
          auditTrail: []
        }
      };

      const mockUpdatedContract = {
        ...mockContract,
        signatures: [mockSignature],
        status: 'partially-signed' as ContractStatus
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // getById call
        .mockResolvedValueOnce({ Item: mockContract }) // getById call in update
        .mockResolvedValueOnce({ Attributes: mockUpdatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.addSignature('contract-123', mockSignature, 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(result.signatures).toHaveLength(1);
      expect(result.signatures[0]).toEqual(mockSignature);
    });
  });

  describe('updateMilestone', () => {
    it('should update milestone status', async () => {
      const mockMilestone: ContractMilestone = {
        id: 'milestone-123',
        name: 'Foundation completion',
        description: 'Foundation work completed',
        targetDate: '2024-02-15T00:00:00.000Z',
        status: 'pending',
        dependencies: [],
        deliverables: [],
        paymentTrigger: true,
        inspectionRequired: true,
        approvalRequired: true
      };

      const mockContract = {
        ...mockContractData,
        id: 'contract-123',
        milestones: [mockMilestone]
      };

      const mockUpdatedMilestone = {
        ...mockMilestone,
        status: 'completed' as const,
        actualDate: '2024-02-15T10:00:00.000Z'
      };

      const mockUpdatedContract = {
        ...mockContract,
        milestones: [mockUpdatedMilestone]
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // getById call
        .mockResolvedValueOnce({ Item: mockContract }) // getById call in update
        .mockResolvedValueOnce({ Attributes: mockUpdatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.updateMilestone(
        'contract-123', 
        'milestone-123', 
        { status: 'completed', actualDate: '2024-02-15T10:00:00.000Z' }, 
        'user-123'
      );

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(result.milestones[0].status).toBe('completed');
    });
  });

  describe('addVariation', () => {
    it('should add variation to contract', async () => {
      const mockContract = {
        ...mockContractData,
        id: 'contract-123',
        variations: []
      };

      const mockVariation: ContractVariation = {
        id: 'variation-123',
        variationNumber: 'VAR-001',
        description: 'Additional electrical work',
        reason: 'Client request',
        requestedBy: 'homeowner',
        requestedAt: '2024-01-15T10:00:00.000Z',
        status: 'requested',
        costImpact: 5000,
        timeImpact: 7,
        specification: 'Additional power outlets',
        approvalRequired: true,
        documents: [],
        notes: 'Additional work requested by client'
      };

      const mockUpdatedContract = {
        ...mockContract,
        variations: [mockVariation]
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // getById call
        .mockResolvedValueOnce({ Item: mockContract }) // getById call in update
        .mockResolvedValueOnce({ Attributes: mockUpdatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.addVariation('contract-123', mockVariation, 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(result.variations).toHaveLength(1);
      expect(result.variations[0]).toEqual(mockVariation);
    });
  });

  describe('recordPayment', () => {
    it('should record payment for contract', async () => {
      const mockContract = {
        ...mockContractData,
        id: 'contract-123',
        payments: []
      };

      const mockPayment: ContractPayment = {
        id: 'payment-123',
        milestoneId: 'milestone-123',
        amount: 10000,
        currency: 'GBP',
        dueDate: '2024-02-15T00:00:00.000Z',
        status: 'paid',
        retentionHeld: 500,
        netAmount: 9500,
        documents: [],
        paidDate: '2024-02-15T10:00:00.000Z'
      };

      const mockUpdatedContract = {
        ...mockContract,
        payments: [mockPayment]
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // getById call
        .mockResolvedValueOnce({ Item: mockContract }) // getById call in update
        .mockResolvedValueOnce({ Attributes: mockUpdatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.recordPayment('contract-123', mockPayment, 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0]).toEqual(mockPayment);
    });
  });

  describe('terminate', () => {
    it('should terminate contract', async () => {
      const mockContract = {
        ...mockContractData,
        id: 'contract-123',
        status: 'active' as ContractStatus
      };

      const mockTerminatedContract = {
        ...mockContract,
        status: 'terminated' as ContractStatus,
        terminatedAt: '2024-01-15T10:00:00.000Z'
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // getById call in update
        .mockResolvedValueOnce({ Attributes: mockTerminatedContract }) // update call
        .mockResolvedValueOnce({}); // audit entry call

      const result = await ContractModel.terminate('contract-123', 'Breach of contract', 'user-123');

      expect(mockSend).toHaveBeenCalledTimes(4);
      expect(result.status).toBe('terminated');
      expect(result.terminatedAt).toBeDefined();
    });
  });

  describe('generateContractNumber', () => {
    it('should generate unique contract number', () => {
      const projectId = 'project-12345678';
      const contractNumber = ContractModel.generateContractNumber(projectId);

      expect(contractNumber).toMatch(/^CON-\d{6}-PROJECT--\d{3}$/);
    });
  });

  describe('getStatistics', () => {
    it('should return contract statistics for homeowner', async () => {
      const mockContracts = [
        { ...mockContractData, status: 'active', terms: { ...mockContractData.terms, totalValue: 50000 } },
        { ...mockContractData, status: 'completed', terms: { ...mockContractData.terms, totalValue: 30000 } },
        { ...mockContractData, status: 'draft', terms: { ...mockContractData.terms, totalValue: 20000 } }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const result = await ContractModel.getStatistics('homeowner-123', 'homeowner');

      expect(result.total).toBe(3);
      expect(result.totalValue).toBe(100000);
      expect(result.averageValue).toBe(33333.333333333336);
      expect(result.byStatus.active).toBe(1);
      expect(result.byStatus.completed).toBe(1);
      expect(result.byStatus.draft).toBe(1);
    });
  });
});