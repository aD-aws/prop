import { ContractService } from '../../services/ContractService';
import { ContractModel } from '../../models/Contract';
import { QuoteService } from '../../services/QuoteService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { ProjectService } from '../../services/ProjectService';
import { UserService } from '../../services/UserService';
import { 
  ContractGenerationRequest,
  ContractStatus,
  DigitalSignatureRequest,
  ContractVariation,
  ContractPayment
} from '../../types';

// Mock AWS SDK and external services
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../../services/QuoteService');
jest.mock('../../services/SoWGenerationService');
jest.mock('../../services/ProjectService');
jest.mock('../../services/UserService');

const mockQuoteService = QuoteService as jest.Mocked<typeof QuoteService>;
const mockSoWService = SoWGenerationService as jest.Mocked<typeof SoWGenerationService>;
const mockProjectService = ProjectService as jest.Mocked<typeof ProjectService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;

// Mock DynamoDB operations
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
  QueryCommand: jest.fn()
}));

describe('Contract Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockQuote = {
    id: 'quote-123',
    sowId: 'sow-123',
    builderId: 'builder-123',
    totalPrice: 50000,
    currency: 'GBP',
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
      claimsProcess: 'Contact builder'
    },
    status: 'selected'
  };

  const mockSoW = {
    id: 'sow-123',
    projectId: 'project-123',
    ribaStages: [
      {
        stage: 1,
        title: 'Preparation and Briefing',
        description: 'Initial preparation',
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
        description: 'Concrete foundation',
        technicalRequirements: [],
        materials: [],
        workmanship: [],
        testing: [],
        compliance: [],
        aiGenerated: true,
        confidence: 0.9
      }
    ],
    status: 'approved'
  };

  const mockProject = {
    id: 'project-123',
    ownerId: 'homeowner-123',
    projectType: 'rear-extension',
    status: 'quote-review',
    councilData: {
      conservationArea: false,
      listedBuilding: false,
      planningRestrictions: [],
      localAuthority: 'Westminster',
      contactDetails: { name: 'Planning Dept' },
      lastChecked: '2024-01-15T10:00:00.000Z'
    }
  };

  const mockHomeowner = {
    id: 'homeowner-123',
    email: 'homeowner@example.com',
    userType: 'homeowner',
    profile: {
      firstName: 'John',
      lastName: 'Homeowner'
    }
  };

  const mockBuilder = {
    id: 'builder-123',
    email: 'builder@example.com',
    userType: 'builder',
    profile: {
      firstName: 'Jane',
      lastName: 'Builder',
      companyName: 'Test Builder Ltd'
    }
  };

  describe('Complete Contract Generation and Signing Workflow', () => {
    it('should complete full contract workflow from generation to signing', async () => {
      // Setup mocks for contract generation
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

      // Mock DynamoDB operations for contract creation
      mockSend
        .mockResolvedValueOnce({}) // Contract creation
        .mockResolvedValueOnce({}); // Audit entry creation

      // Step 1: Generate contract
      const generationRequest: ContractGenerationRequest = {
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

      const generationResult = await ContractService.generateContract(generationRequest);

      expect(generationResult.success).toBe(true);
      expect(generationResult.contractId).toBeDefined();
      expect(generationResult.contract).toBeDefined();
      expect(generationResult.contract?.status).toBe('draft');

      // Step 2: Request digital signatures
      const contractId = generationResult.contractId!;

      // Mock contract retrieval for signature requests
      const mockContract = {
        id: contractId,
        homeownerId: 'homeowner-123',
        builderId: 'builder-123',
        signatures: [
          {
            id: 'sig-homeowner',
            signerEmail: 'homeowner@example.com',
            status: 'pending'
          },
          {
            id: 'sig-builder',
            signerEmail: 'builder@example.com',
            status: 'pending'
          }
        ]
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract for homeowner signature
        .mockResolvedValueOnce({ Attributes: { ...mockContract, status: 'pending-signatures' } }) // Update contract
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract for builder signature
        .mockResolvedValueOnce({ Attributes: { ...mockContract, status: 'pending-signatures' } }); // Update contract

      // Request homeowner signature
      const homeownerSignatureRequest: DigitalSignatureRequest = {
        contractId,
        signerEmail: 'homeowner@example.com',
        signerName: 'John Homeowner',
        signerRole: 'homeowner',
        signatureType: 'electronic',
        witnessRequired: false,
        expiryDays: 7,
        reminderDays: [3, 1]
      };

      const homeownerSignatureResult = await ContractService.requestDigitalSignature(homeownerSignatureRequest);

      expect(homeownerSignatureResult.success).toBe(true);
      expect(homeownerSignatureResult.signatureId).toBeDefined();
      expect(homeownerSignatureResult.signingUrl).toBeDefined();

      // Request builder signature
      const builderSignatureRequest: DigitalSignatureRequest = {
        contractId,
        signerEmail: 'builder@example.com',
        signerName: 'Jane Builder',
        signerRole: 'builder',
        signatureType: 'electronic',
        witnessRequired: false,
        expiryDays: 7,
        reminderDays: [3, 1]
      };

      const builderSignatureResult = await ContractService.requestDigitalSignature(builderSignatureRequest);

      expect(builderSignatureResult.success).toBe(true);
      expect(builderSignatureResult.signatureId).toBeDefined();

      // Step 3: Process digital signatures
      const mockSignedContract = {
        ...mockContract,
        signatures: [
          {
            id: 'sig-homeowner',
            signerEmail: 'homeowner@example.com',
            status: 'signed',
            verificationCode: 'HOMEOWNER_CODE'
          },
          {
            id: 'sig-builder',
            signerEmail: 'builder@example.com',
            status: 'signed',
            verificationCode: 'BUILDER_CODE'
          }
        ],
        status: 'fully-signed'
      };

      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract for homeowner signing
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract in addSignature
        .mockResolvedValueOnce({ Attributes: { ...mockContract, status: 'partially-signed' } }) // Update with homeowner signature
        .mockResolvedValueOnce({}) // Audit entry
        .mockResolvedValueOnce({ Item: { ...mockContract, status: 'partially-signed' } }) // Get contract for builder signing
        .mockResolvedValueOnce({ Item: { ...mockContract, status: 'partially-signed' } }) // Get contract in addSignature
        .mockResolvedValueOnce({ Attributes: mockSignedContract }) // Update with builder signature (fully signed)
        .mockResolvedValueOnce({}); // Audit entry

      // Process homeowner signature
      const homeownerSigningResult = await ContractService.processDigitalSignature(
        contractId,
        'sig-homeowner',
        'homeowner-signature-data',
        'HOMEOWNER_CODE',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(homeownerSigningResult.valid).toBe(true);
      expect(homeownerSigningResult.signatureId).toBe('sig-homeowner');

      // Process builder signature
      const builderSigningResult = await ContractService.processDigitalSignature(
        contractId,
        'sig-builder',
        'builder-signature-data',
        'BUILDER_CODE',
        '192.168.1.2',
        'Mozilla/5.0'
      );

      expect(builderSigningResult.valid).toBe(true);
      expect(builderSigningResult.signatureId).toBe('sig-builder');

      // Step 4: Activate contract
      mockSend
        .mockResolvedValueOnce({ Item: mockSignedContract }) // Get contract for status update
        .mockResolvedValueOnce({ Attributes: { ...mockSignedContract, status: 'active' } }) // Update status
        .mockResolvedValueOnce({}); // Audit entry

      const activatedContract = await ContractService.updateStatus(
        contractId,
        'active',
        'homeowner-123',
        'All signatures received and verified'
      );

      expect(activatedContract.status).toBe('active');
      expect(mockProjectServiceInstance.updateProjectStatus).toHaveBeenCalledWith('project-123', 'active');

      // Verify the complete workflow
      expect(mockSend).toHaveBeenCalledTimes(11); // All DynamoDB operations
      expect(mockQuoteServiceInstance.getQuote).toHaveBeenCalledWith('quote-123');
      expect(mockSoWServiceInstance.getScopeOfWork).toHaveBeenCalledWith('sow-123');
      expect(mockProjectServiceInstance.getProjectById).toHaveBeenCalledWith('project-123');
      expect(mockUserServiceInstance.getUserById).toHaveBeenCalledTimes(2);
    });
  });

  describe('Contract Variation Workflow', () => {
    it('should handle contract variations workflow', async () => {
      const contractId = 'contract-123';
      const mockContract = {
        id: contractId,
        homeownerId: 'homeowner-123',
        builderId: 'builder-123',
        status: 'active',
        variations: []
      };

      // Mock contract retrieval and variation addition
      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract in addVariation
        .mockResolvedValueOnce({ 
          Attributes: { 
            ...mockContract, 
            variations: [{ 
              id: 'var-123', 
              variationNumber: 'VAR-001',
              description: 'Additional electrical work',
              status: 'requested'
            }] 
          } 
        }) // Update with variation
        .mockResolvedValueOnce({}); // Audit entry

      const variationData: Omit<ContractVariation, 'id' | 'variationNumber'> = {
        description: 'Additional electrical work',
        reason: 'Client requested extra power outlets',
        requestedBy: 'homeowner',
        requestedAt: '2024-01-15T10:00:00.000Z',
        status: 'requested',
        costImpact: 5000,
        timeImpact: 7,
        specification: 'Install 6 additional double power outlets in kitchen area',
        approvalRequired: true,
        documents: [],
        notes: 'Client wants additional outlets for kitchen appliances'
      };

      const result = await ContractService.addVariation(contractId, variationData, 'homeowner-123');

      expect(result.variations).toHaveLength(1);
      expect(result.variations[0].description).toBe('Additional electrical work');
      expect(result.variations[0].variationNumber).toBe('VAR-001');
      expect(result.variations[0].status).toBe('requested');
    });
  });

  describe('Contract Milestone and Payment Workflow', () => {
    it('should handle milestone completion and payment workflow', async () => {
      const contractId = 'contract-123';
      const milestoneId = 'milestone-123';
      
      const mockContract = {
        id: contractId,
        homeownerId: 'homeowner-123',
        builderId: 'builder-123',
        status: 'active',
        milestones: [
          {
            id: milestoneId,
            name: 'Foundation completion',
            status: 'pending',
            paymentTrigger: true
          }
        ],
        payments: []
      };

      // Step 1: Complete milestone
      mockSend
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract
        .mockResolvedValueOnce({ Item: mockContract }) // Get contract in updateMilestone
        .mockResolvedValueOnce({ 
          Attributes: { 
            ...mockContract, 
            milestones: [{ 
              ...mockContract.milestones[0], 
              status: 'completed',
              actualDate: '2024-01-15T10:00:00.000Z'
            }] 
          } 
        }) // Update milestone
        .mockResolvedValueOnce({}); // Audit entry

      const completedContract = await ContractService.completeMilestone(
        contractId,
        milestoneId,
        'builder-123',
        'Foundation work completed as per specification'
      );

      expect(completedContract.milestones[0].status).toBe('completed');

      // Step 2: Record payment
      const updatedContract = {
        ...completedContract,
        payments: []
      };

      mockSend
        .mockResolvedValueOnce({ Item: updatedContract }) // Get contract
        .mockResolvedValueOnce({ Item: updatedContract }) // Get contract in recordPayment
        .mockResolvedValueOnce({ 
          Attributes: { 
            ...updatedContract, 
            payments: [{ 
              id: 'payment-123',
              milestoneId,
              amount: 15000,
              status: 'paid'
            }] 
          } 
        }) // Update with payment
        .mockResolvedValueOnce({}); // Audit entry

      const paymentData: Omit<ContractPayment, 'id'> = {
        milestoneId,
        amount: 15000,
        currency: 'GBP',
        dueDate: '2024-01-20T00:00:00.000Z',
        paidDate: '2024-01-18T10:00:00.000Z',
        status: 'paid',
        method: 'bank-transfer',
        reference: 'TXN-123456',
        retentionHeld: 750,
        netAmount: 14250,
        documents: ['invoice-123.pdf', 'receipt-123.pdf']
      };

      const paidContract = await ContractService.recordPayment(
        contractId,
        paymentData,
        'homeowner-123'
      );

      expect(paidContract.payments).toHaveLength(1);
      expect(paidContract.payments[0].amount).toBe(15000);
      expect(paidContract.payments[0].status).toBe('paid');
    });
  });

  describe('Contract Statistics and Reporting', () => {
    it('should generate contract statistics for homeowner', async () => {
      const homeownerId = 'homeowner-123';
      const mockContracts = [
        { status: 'active', terms: { totalValue: 50000 } },
        { status: 'completed', terms: { totalValue: 30000 } },
        { status: 'draft', terms: { totalValue: 20000 } }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const statistics = await ContractService.getStatistics(homeownerId, 'homeowner');

      expect(statistics.total).toBe(3);
      expect(statistics.totalValue).toBe(100000);
      expect(statistics.averageValue).toBeCloseTo(33333.33);
      expect(statistics.byStatus.active).toBe(1);
      expect(statistics.byStatus.completed).toBe(1);
      expect(statistics.byStatus.draft).toBe(1);
    });

    it('should generate contract statistics for builder', async () => {
      const builderId = 'builder-123';
      const mockContracts = [
        { status: 'active', terms: { totalValue: 75000 } },
        { status: 'completed', terms: { totalValue: 45000 } }
      ];

      mockSend.mockResolvedValueOnce({ Items: mockContracts });

      const statistics = await ContractService.getStatistics(builderId, 'builder');

      expect(statistics.total).toBe(2);
      expect(statistics.totalValue).toBe(120000);
      expect(statistics.averageValue).toBe(60000);
      expect(statistics.byStatus.active).toBe(1);
      expect(statistics.byStatus.completed).toBe(1);
    });
  });

  describe('Contract Error Handling', () => {
    it('should handle contract generation failures gracefully', async () => {
      // Mock service failures
      const mockQuoteServiceInstance = {
        getQuote: jest.fn().mockRejectedValue(new Error('Quote service unavailable'))
      };
      (QuoteService as any).mockImplementation(() => mockQuoteServiceInstance);

      const generationRequest: ContractGenerationRequest = {
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

      const result = await ContractService.generateContract(generationRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to generate contract');
    });

    it('should handle signature processing failures', async () => {
      const mockContract = {
        id: 'contract-123',
        signatures: [
          {
            id: 'signature-123',
            verificationCode: 'CORRECT_CODE',
            signerEmail: 'test@example.com'
          }
        ]
      };

      mockSend.mockResolvedValueOnce({ Item: mockContract });

      // Test with wrong verification code
      await expect(ContractService.processDigitalSignature(
        'contract-123',
        'signature-123',
        'signature-data',
        'WRONG_CODE',
        '192.168.1.1',
        'Mozilla/5.0'
      )).rejects.toThrow('Invalid verification code');
    });

    it('should handle database errors during contract operations', async () => {
      mockSend.mockRejectedValue(new Error('DynamoDB connection failed'));

      await expect(ContractService.getById('contract-123'))
        .rejects.toThrow('Failed to get contract');
    });
  });
});