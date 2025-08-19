import { ContractService } from '../../services/ContractService';
import { ContractModel } from '../../models/Contract';
import { QuoteService } from '../../services/QuoteService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { ProjectService } from '../../services/ProjectService';
import { UserService } from '../../services/UserService';
import { 
  ContractGenerationRequest, 
  ContractGenerationPreferences,
  Quote,
  ScopeOfWork,
  Project,
  User,
  ContractStatus,
  DigitalSignatureRequest
} from '../../types';

// Mock dependencies
jest.mock('../../models/Contract');
jest.mock('../../services/QuoteService');
jest.mock('../../services/SoWGenerationService');
jest.mock('../../services/ProjectService');
jest.mock('../../services/UserService');

const mockContractModel = ContractModel as jest.Mocked<typeof ContractModel>;
const mockQuoteService = QuoteService as jest.Mocked<typeof QuoteService>;
const mockSoWService = SoWGenerationService as jest.Mocked<typeof SoWGenerationService>;
const mockProjectService = ProjectService as jest.Mocked<typeof ProjectService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

describe('ContractService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockQuote: Quote = {
    PK: 'SOW#sow-123',
    SK: 'QUOTE#quote-123',
    id: 'quote-123',
    sowId: 'sow-123',
    builderId: 'builder-123',
    builderProfile: {
      companyName: 'Test Builder Ltd',
      address: {
        line1: '123 Builder St',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      },
      contactPerson: {
        name: 'John Builder',
        title: 'Director',
        phone: '020 1234 5678',
        email: 'john@testbuilder.com'
      },
      specializations: ['extensions'],
      serviceAreas: ['London'],
      rating: {
        overall: 4.5,
        reviewCount: 50,
        qualityScore: 4.6,
        timelinessScore: 4.4,
        communicationScore: 4.5,
        valueScore: 4.3,
        lastUpdated: '2024-01-01T00:00:00.000Z'
      }
    },
    totalPrice: 50000,
    currency: 'GBP',
    breakdown: [],
    timeline: {
      totalDuration: 90,
      phases: [
        {
          id: 'phase-1',
          name: 'Foundation',
          description: 'Foundation work',
          startDay: 1,
          duration: 30,
          dependencies: [],
          resources: [],
          deliverables: ['Foundation complete'],
          milestones: []
        }
      ],
      criticalPath: [],
      bufferDays: 10,
      weatherDependency: true,
      seasonalFactors: []
    },
    warranty: {
      workmanshipWarranty: {
        duration: 12,
        unit: 'months',
        coverage: 'All workmanship',
        limitations: []
      },
      materialsWarranty: {
        duration: 12,
        unit: 'months',
        coverage: 'Material defects',
        limitations: []
      },
      exclusions: [],
      conditions: [],
      insuranceBacked: true,
      claimsProcess: 'Contact builder directly'
    },
    certifications: [],
    terms: {
      paymentSchedule: {
        type: 'milestone',
        schedule: [],
        retentionHeld: 5,
        paymentTerms: 14
      },
      variationPolicy: 'Written approval required',
      cancellationPolicy: '14 days notice',
      retentionPercentage: 5,
      retentionPeriod: 12,
      disputeResolution: 'Mediation then arbitration',
      governingLaw: 'English Law',
      additionalTerms: []
    },
    methodology: 'NRM2',
    complianceStatement: {
      ribaCompliance: true,
      ribaStagesAddressed: [1, 2, 3],
      nrmCompliance: true,
      nrmMethodology: 'NRM2',
      nhbcCompliance: true,
      nhbcChapters: ['Chapter 1'],
      ricsCompliance: true,
      ricsStandards: ['RICS Standard 1'],
      buildingRegulationsCompliance: true,
      regulationsAddressed: ['Part A'],
      additionalStandards: [],
      complianceNotes: 'Fully compliant',
      certificationRequired: []
    },
    validUntil: '2024-03-01T00:00:00.000Z',
    status: 'selected',
    submittedAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    version: 1,
    GSI3PK: 'builder-123',
    GSI3SK: 'selected#2024-01-15T10:00:00.000Z'
  };

  const mockSoW: ScopeOfWork = {
    PK: 'SOW#sow-123',
    SK: 'METADATA',
    id: 'sow-123',
    projectId: 'project-123',
    version: 1,
    ribaStages: [
      {
        stage: 1,
        title: 'Preparation and Briefing',
        description: 'Initial preparation and briefing',
        deliverables: ['Project brief'],
        duration: 14,
        dependencies: [],
        workPackages: [],
        milestones: [],
        riskFactors: [],
        qualityStandards: []
      }
    ],
    specifications: [
      {
        id: 'spec-1',
        category: 'structural',
        title: 'Foundation specification',
        description: 'Concrete foundation specification',
        technicalRequirements: [],
        materials: [],
        workmanship: [],
        testing: [],
        compliance: [],
        aiGenerated: true,
        confidence: 0.9
      }
    ],
    materials: {
      categories: [],
      totalEstimatedCost: 15000,
      currency: 'GBP',
      lastUpdated: '2024-01-15T10:00:00.000Z',
      supplierRecommendations: [],
      sustainabilityScore: 80,
      aiGenerated: true
    },
    costEstimate: {
      id: 'cost-123',
      projectId: 'project-123',
      methodology: 'NRM1',
      totalCost: 50000,
      currency: 'GBP',
      breakdown: [],
      confidence: {
        overall: 0.85,
        dataQuality: 0.9,
        marketStability: 0.8,
        projectComplexity: 0.85,
        timeHorizon: 0.8,
        explanation: 'High confidence estimate',
        factors: []
      },
      marketRates: {
        region: 'London',
        lastUpdated: '2024-01-15T10:00:00.000Z',
        source: 'BCIS',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: '2024-01-15T10:00:00.000Z',
      validUntil: '2024-03-15T10:00:00.000Z',
      version: 1,
      status: 'approved'
    },
    complianceChecks: [],
    workPhases: [],
    deliverables: [],
    generatedAt: '2024-01-15T10:00:00.000Z',
    status: 'approved',
    aiGenerationMetadata: {
      model: 'claude-3.5-sonnet',
      version: '1.0',
      promptVersion: '1.0',
      generationTime: 5000,
      tokensUsed: 1000,
      confidence: 0.9,
      iterationsRequired: 1,
      validationPassed: true,
      knowledgeBaseSources: ['RICS', 'RIBA'],
      customizations: []
    },
    validationResults: []
  };

  const mockProject: Project = {
    PK: 'PROJECT#project-123',
    SK: 'METADATA',
    id: 'project-123',
    ownerId: 'homeowner-123',
    propertyAddress: {
      line1: '123 Test St',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA',
      country: 'UK'
    },
    projectType: 'rear-extension',
    status: 'quote-review',
    requirements: {
      description: 'Rear extension project',
      dimensions: {
        length: 5,
        width: 4,
        height: 3,
        area: 20,
        unit: 'meters'
      },
      materials: {
        quality: 'standard',
        preferences: ['brick'],
        restrictions: []
      },
      timeline: {
        flexibility: 'flexible'
      },
      budget: {
        min: 40000,
        max: 60000,
        currency: 'GBP'
      },
      specialRequirements: []
    },
    documents: [],
    councilData: {
      conservationArea: false,
      listedBuilding: false,
      planningRestrictions: [],
      localAuthority: 'Westminster City Council',
      contactDetails: {
        name: 'Planning Department',
        phone: '020 7641 6500',
        email: 'planning@westminster.gov.uk'
      },
      lastChecked: '2024-01-15T10:00:00.000Z'
    },
    sowId: 'sow-123',
    selectedQuoteId: 'quote-123',
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    GSI2PK: 'quote-review',
    GSI2SK: '2024-01-15T10:00:00.000Z'
  };

  const mockHomeowner: User = {
    PK: 'USER#homeowner-123',
    SK: 'PROFILE',
    id: 'homeowner-123',
    email: 'homeowner@example.com',
    userType: 'homeowner',
    profile: {
      firstName: 'John',
      lastName: 'Homeowner',
      phone: '020 1234 5678'
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    gdprConsent: true,
    emailVerified: true,
    GSI1PK: 'homeowner@example.com',
    GSI1SK: 'homeowner'
  };

  const mockBuilder: User = {
    PK: 'USER#builder-123',
    SK: 'PROFILE',
    id: 'builder-123',
    email: 'builder@example.com',
    userType: 'builder',
    profile: {
      firstName: 'Jane',
      lastName: 'Builder',
      companyName: 'Test Builder Ltd',
      phone: '020 8765 4321'
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    gdprConsent: true,
    emailVerified: true,
    GSI1PK: 'builder@example.com',
    GSI1SK: 'builder'
  };

  const mockGenerationRequest: ContractGenerationRequest = {
    projectId: 'project-123',
    sowId: 'sow-123',
    quoteId: 'quote-123',
    homeownerId: 'homeowner-123',
    builderId: 'builder-123',
    preferences: {
      template: 'standard',
      paymentScheduleType: 'milestone',
      warrantyPeriod: 12,
      retentionPercentage: 5,
      delayPenalties: true,
      variationAllowance: 10,
      insuranceRequirements: 'standard',
      disputeResolution: 'mediation',
      additionalProtections: []
    }
  };

  describe('generateContract', () => {
    it('should generate contract successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        projectId: 'project-123',
        sowId: 'sow-123',
        quoteId: 'quote-123',
        homeownerId: 'homeowner-123',
        builderId: 'builder-123',
        status: 'draft' as ContractStatus
      };

      // Mock service calls
      const mockQuoteServiceInstance = {
        getQuote: jest.fn().mockResolvedValue({ success: true, data: mockQuote })
      };
      const mockSoWServiceInstance = {
        getScopeOfWork: jest.fn().mockResolvedValue(mockSoW)
      };
      const mockProjectServiceInstance = {
        getProjectById: jest.fn().mockResolvedValue(mockProject),
        updateProjectStatus: jest.fn().mockResolvedValue(mockProject)
      };
      const mockUserServiceInstance = {
        getUserById: jest.fn()
          .mockResolvedValueOnce(mockHomeowner)
          .mockResolvedValueOnce(mockBuilder)
      };

      // Mock constructors
      (QuoteService as any).mockImplementation(() => mockQuoteServiceInstance);
      (SoWGenerationService as any).mockImplementation(() => mockSoWServiceInstance);
      (ProjectService as any).mockImplementation(() => mockProjectServiceInstance);
      (UserService as any).mockImplementation(() => mockUserServiceInstance);
      mockContractModel.create.mockResolvedValue(mockContract as any);

      const result = await ContractService.generateContract(mockGenerationRequest);

      expect(result.success).toBe(true);
      expect(result.contractId).toBe('contract-123');
      expect(result.contract).toEqual(mockContract);
      expect(mockContractModel.create).toHaveBeenCalledTimes(1);
    });

    it('should fail when quote is not selected', async () => {
      const unselectedQuote = { ...mockQuote, status: 'submitted' as const };
      
      const mockQuoteServiceInstance = {
        getQuote: jest.fn().mockResolvedValue({ success: true, data: unselectedQuote })
      };
      (QuoteService as any).mockImplementation(() => mockQuoteServiceInstance);

      const result = await ContractService.generateContract(mockGenerationRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Quote must be selected before generating contract');
    });

    it('should fail when required data is missing', async () => {
      const mockQuoteServiceInstance = {
        getQuote: jest.fn().mockResolvedValue({ success: false, data: null })
      };
      (QuoteService as any).mockImplementation(() => mockQuoteServiceInstance);

      const result = await ContractService.generateContract(mockGenerationRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Required data not found');
    });

    it('should handle generation errors', async () => {
      const mockQuoteServiceInstance = {
        getQuote: jest.fn().mockRejectedValue(new Error('Service error'))
      };
      (QuoteService as any).mockImplementation(() => mockQuoteServiceInstance);

      const result = await ContractService.generateContract(mockGenerationRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to generate contract');
    });
  });

  describe('getById', () => {
    it('should retrieve contract by ID', async () => {
      const mockContract = { id: 'contract-123' };
      mockContractModel.getById.mockResolvedValue(mockContract as any);

      const result = await ContractService.getById('contract-123');

      expect(result).toEqual(mockContract);
      expect(mockContractModel.getById).toHaveBeenCalledWith('contract-123');
    });
  });

  describe('updateStatus', () => {
    it('should update contract status', async () => {
      const mockContract = {
        id: 'contract-123',
        projectId: 'project-123',
        status: 'active' as ContractStatus
      };

      mockContractModel.update.mockResolvedValue(mockContract as any);

      const result = await ContractService.updateStatus('contract-123', 'active', 'user-123');

      expect(result).toEqual(mockContract);
      expect(mockContractModel.update).toHaveBeenCalledWith('contract-123', { status: 'active' }, 'user-123');
    });

    it('should update project status when contract becomes active', async () => {
      const mockContract = {
        id: 'contract-123',
        projectId: 'project-123',
        status: 'active' as ContractStatus
      };

      const mockProjectServiceInstance = {
        updateProjectStatus: jest.fn().mockResolvedValue(mockContract)
      };
      (ProjectService as any).mockImplementation(() => mockProjectServiceInstance);

      mockContractModel.update.mockResolvedValue(mockContract as any);

      await ContractService.updateStatus('contract-123', 'active', 'user-123');

      expect(mockProjectServiceInstance.updateProjectStatus).toHaveBeenCalledWith('project-123', 'active');
    });
  });

  describe('requestDigitalSignature', () => {
    it('should request digital signature successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        signatures: [
          {
            id: 'sig-1',
            signerEmail: 'test@example.com',
            status: 'pending'
          }
        ]
      };

      const signatureRequest: DigitalSignatureRequest = {
        contractId: 'contract-123',
        signerEmail: 'test@example.com',
        signerName: 'Test Signer',
        signerRole: 'homeowner',
        signatureType: 'electronic',
        witnessRequired: false,
        expiryDays: 7,
        reminderDays: [3, 1]
      };

      mockContractModel.getById.mockResolvedValue(mockContract as any);
      mockContractModel.update.mockResolvedValue(mockContract as any);

      const result = await ContractService.requestDigitalSignature(signatureRequest);

      expect(result.success).toBe(true);
      expect(result.signatureId).toBeDefined();
      expect(result.signingUrl).toBeDefined();
      expect(result.verificationCode).toBeDefined();
    });

    it('should fail when contract not found', async () => {
      mockContractModel.getById.mockResolvedValue(null);

      const signatureRequest: DigitalSignatureRequest = {
        contractId: 'nonexistent-contract',
        signerEmail: 'test@example.com',
        signerName: 'Test Signer',
        signerRole: 'homeowner',
        signatureType: 'electronic',
        witnessRequired: false,
        expiryDays: 7,
        reminderDays: []
      };

      const result = await ContractService.requestDigitalSignature(signatureRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Contract not found');
    });
  });

  describe('processDigitalSignature', () => {
    it('should process digital signature successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        signatures: [
          {
            id: 'signature-123',
            verificationCode: 'TESTCODE123',
            signerEmail: 'test@example.com'
          }
        ]
      };

      mockContractModel.getById.mockResolvedValue(mockContract as any);
      mockContractModel.addSignature.mockResolvedValue(mockContract as any);

      const result = await ContractService.processDigitalSignature(
        'contract-123',
        'signature-123',
        'signature-data',
        'TESTCODE123',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result.valid).toBe(true);
      expect(result.signatureId).toBe('signature-123');
      expect(mockContractModel.addSignature).toHaveBeenCalledTimes(1);
    });

    it('should fail with invalid verification code', async () => {
      const mockContract = {
        id: 'contract-123',
        signatures: [
          {
            id: 'signature-123',
            verificationCode: 'CORRECTCODE',
            signerEmail: 'test@example.com'
          }
        ]
      };

      mockContractModel.getById.mockResolvedValue(mockContract as any);

      await expect(ContractService.processDigitalSignature(
        'contract-123',
        'signature-123',
        'signature-data',
        'WRONGCODE',
        '192.168.1.1',
        'Mozilla/5.0'
      )).rejects.toThrow('Invalid verification code');
    });
  });

  describe('addVariation', () => {
    it('should add variation to contract', async () => {
      const mockContract = {
        id: 'contract-123',
        variations: []
      };

      const variationData = {
        description: 'Additional work',
        reason: 'Client request',
        requestedBy: 'homeowner' as const,
        requestedAt: '2024-01-15T10:00:00.000Z',
        status: 'requested' as const,
        costImpact: 5000,
        timeImpact: 7,
        specification: 'Additional electrical work',
        approvalRequired: true,
        documents: []
      };

      mockContractModel.getById.mockResolvedValue(mockContract as any);
      mockContractModel.addVariation.mockResolvedValue({
        ...mockContract,
        variations: [{ ...variationData, id: 'var-123', variationNumber: 'VAR-001' }]
      } as any);

      const result = await ContractService.addVariation('contract-123', variationData, 'user-123');

      expect(result.variations).toHaveLength(1);
      expect(mockContractModel.addVariation).toHaveBeenCalledWith(
        'contract-123',
        expect.objectContaining({
          ...variationData,
          id: expect.any(String),
          variationNumber: 'VAR-001'
        }),
        'user-123'
      );
    });
  });

  describe('completeMilestone', () => {
    it('should complete milestone', async () => {
      const mockContract = {
        id: 'contract-123',
        milestones: [
          {
            id: 'milestone-123',
            status: 'pending'
          }
        ]
      };

      mockContractModel.updateMilestone.mockResolvedValue({
        ...mockContract,
        milestones: [
          {
            id: 'milestone-123',
            status: 'completed',
            actualDate: '2024-01-15T10:00:00.000Z'
          }
        ]
      } as any);

      const result = await ContractService.completeMilestone(
        'contract-123',
        'milestone-123',
        'user-123',
        'Milestone completed successfully'
      );

      expect(result.milestones[0].status).toBe('completed');
      expect(mockContractModel.updateMilestone).toHaveBeenCalledWith(
        'contract-123',
        'milestone-123',
        expect.objectContaining({
          status: 'completed',
          actualDate: expect.any(String),
          approvedBy: 'user-123',
          approvedAt: expect.any(String),
          notes: 'Milestone completed successfully'
        }),
        'user-123'
      );
    });
  });

  describe('recordPayment', () => {
    it('should record payment', async () => {
      const mockContract = {
        id: 'contract-123',
        payments: []
      };

      const paymentData = {
        milestoneId: 'milestone-123',
        amount: 10000,
        currency: 'GBP' as const,
        dueDate: '2024-02-15T00:00:00.000Z',
        status: 'paid' as const,
        retentionHeld: 500,
        netAmount: 9500,
        documents: []
      };

      mockContractModel.recordPayment.mockResolvedValue({
        ...mockContract,
        payments: [{ ...paymentData, id: 'payment-123' }]
      } as any);

      const result = await ContractService.recordPayment('contract-123', paymentData, 'user-123');

      expect(result.payments).toHaveLength(1);
      expect(mockContractModel.recordPayment).toHaveBeenCalledWith(
        'contract-123',
        expect.objectContaining({
          ...paymentData,
          id: expect.any(String)
        }),
        'user-123'
      );
    });
  });

  describe('getByHomeownerId', () => {
    it('should get contracts by homeowner ID', async () => {
      const mockContracts = [
        { id: 'contract-1', homeownerId: 'homeowner-123' },
        { id: 'contract-2', homeownerId: 'homeowner-123' }
      ];

      mockContractModel.getByHomeownerId.mockResolvedValue(mockContracts as any);

      const result = await ContractService.getByHomeownerId('homeowner-123');

      expect(result).toEqual(mockContracts);
      expect(mockContractModel.getByHomeownerId).toHaveBeenCalledWith('homeowner-123', undefined);
    });
  });

  describe('getByBuilderId', () => {
    it('should get contracts by builder ID', async () => {
      const mockContracts = [
        { id: 'contract-1', builderId: 'builder-123' },
        { id: 'contract-2', builderId: 'builder-123' }
      ];

      mockContractModel.getByBuilderId.mockResolvedValue(mockContracts as any);

      const result = await ContractService.getByBuilderId('builder-123');

      expect(result).toEqual(mockContracts);
      expect(mockContractModel.getByBuilderId).toHaveBeenCalledWith('builder-123', undefined);
    });
  });

  describe('getStatistics', () => {
    it('should get contract statistics', async () => {
      const mockStats = {
        total: 5,
        byStatus: {
          'draft': 1,
          'pending-signatures': 1,
          'partially-signed': 0,
          'fully-signed': 1,
          'active': 1,
          'suspended': 0,
          'completed': 1,
          'terminated': 0,
          'disputed': 0,
          'cancelled': 0
        },
        totalValue: 250000,
        averageValue: 50000
      };

      mockContractModel.getStatistics.mockResolvedValue(mockStats as any);

      const result = await ContractService.getStatistics('homeowner-123', 'homeowner');

      expect(result).toEqual(mockStats);
      expect(mockContractModel.getStatistics).toHaveBeenCalledWith('homeowner-123', 'homeowner');
    });
  });
});