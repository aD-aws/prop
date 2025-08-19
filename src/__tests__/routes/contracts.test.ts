import request from 'supertest';
import express from 'express';
import contractRoutes from '../../routes/contracts';
import { ContractService } from '../../services/ContractService';
import { authenticateToken } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';

// Mock dependencies
jest.mock('../../services/ContractService');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/validation');

const mockContractService = ContractService as jest.Mocked<typeof ContractService>;
const mockAuth = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockValidateRequest = validateRequest as jest.MockedFunction<typeof validateRequest>;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/contracts', contractRoutes);

// Mock middleware
mockAuth.mockImplementation((req: any, res: any, next: any) => {
  req.user = {
    userId: 'user-123',
    email: 'test@example.com',
    userType: 'homeowner',
    iat: Date.now(),
    exp: Date.now() + 3600000
  };
  next();
});

mockValidateRequest.mockImplementation(() => (req: any, res: any, next: any) => next());

describe('Contract Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/contracts/generate', () => {
    const mockGenerationRequest = {
      projectId: 'project-123',
      sowId: 'sow-123',
      quoteId: 'quote-123',
      homeownerId: 'user-123',
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

    it('should generate contract successfully', async () => {
      const mockResult = {
        success: true,
        contractId: 'contract-123',
        contract: {
          id: 'contract-123',
          status: 'draft',
          PK: 'CONTRACT#contract-123',
          SK: 'METADATA',
          projectId: 'project-123',
          sowId: 'sow-123',
          quoteId: 'quote-123',
          homeownerId: 'user-123',
          builderId: 'builder-123'
        } as any,
        generationTime: 1500,
        warnings: [],
        errors: [],
        legalReviewRequired: false,
        complianceIssues: [],
        recommendations: ['Keep all documents for your records']
      };

      mockContractService.generateContract.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/contracts/generate')
        .send(mockGenerationRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contractId).toBe('contract-123');
      expect(mockContractService.generateContract).toHaveBeenCalledWith(mockGenerationRequest);
    });

    it('should return 403 when user not authorized', async () => {
      const unauthorizedRequest = {
        ...mockGenerationRequest,
        homeownerId: 'other-user-123'
      };

      const response = await request(app)
        .post('/api/contracts/generate')
        .send(unauthorizedRequest);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should return 400 when generation fails', async () => {
      const mockResult = {
        success: false,
        generationTime: 500,
        warnings: ['Warning message'],
        errors: ['Generation failed'],
        legalReviewRequired: false,
        complianceIssues: [],
        recommendations: []
      };

      mockContractService.generateContract.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/contracts/generate')
        .send(mockGenerationRequest);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTRACT_GENERATION_FAILED');
    });

    it('should handle service errors', async () => {
      mockContractService.generateContract.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/contracts/generate')
        .send(mockGenerationRequest);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/contracts/:contractId', () => {
    it('should get contract by ID successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456',
        status: 'draft'
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);

      const response = await request(app)
        .get('/api/contracts/contract-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContract);
    });

    it('should return 404 when contract not found', async () => {
      mockContractService.getById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/contracts/nonexistent-contract');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('CONTRACT_NOT_FOUND');
    });

    it('should return 403 when user not authorized', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'other-user-123',
        builderId: 'builder-456',
        status: 'draft'
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);

      const response = await request(app)
        .get('/api/contracts/contract-123');

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('PUT /api/contracts/:contractId/status', () => {
    it('should update contract status successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456',
        status: 'active'
      };

      mockContractService.getById.mockResolvedValue({
        ...mockContract,
        status: 'draft'
      } as any);
      mockContractService.updateStatus.mockResolvedValue(mockContract as any);

      const response = await request(app)
        .put('/api/contracts/contract-123/status')
        .send({ status: 'active', reason: 'All signatures received' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('active');
      expect(mockContractService.updateStatus).toHaveBeenCalledWith(
        'contract-123',
        'active',
        'user-123',
        'All signatures received'
      );
    });

    it('should return 400 when status is missing', async () => {
      const response = await request(app)
        .put('/api/contracts/contract-123/status')
        .send({ reason: 'Test reason' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_STATUS');
    });
  });

  describe('POST /api/contracts/:contractId/signatures/request', () => {
    it('should request digital signature successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456'
      };

      const signatureRequest = {
        signerEmail: 'signer@example.com',
        signerName: 'Test Signer',
        signerRole: 'homeowner',
        signatureType: 'electronic',
        witnessRequired: false,
        expiryDays: 7,
        reminderDays: [3, 1]
      };

      const mockResult = {
        success: true,
        signatureId: 'signature-123',
        signingUrl: 'https://example.com/sign/signature-123',
        expiryDate: '2024-01-22T10:00:00.000Z',
        verificationCode: 'VERIFY123'
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);
      mockContractService.requestDigitalSignature.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/contracts/contract-123/signatures/request')
        .send(signatureRequest);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.signatureId).toBe('signature-123');
    });

    it('should return 400 when signature request fails', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456'
      };

      const mockResult = {
        success: false,
        expiryDate: '',
        verificationCode: '',
        error: 'Invalid signer email'
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);
      mockContractService.requestDigitalSignature.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/contracts/contract-123/signatures/request')
        .send({
          signerEmail: 'invalid-email',
          signerName: 'Test Signer',
          signerRole: 'homeowner',
          signatureType: 'electronic',
          witnessRequired: false,
          expiryDays: 7,
          reminderDays: []
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SIGNATURE_REQUEST_FAILED');
    });
  });

  describe('POST /api/contracts/:contractId/signatures/:signatureId/sign', () => {
    it('should process digital signature successfully', async () => {
      const mockResult = {
        valid: true,
        signatureId: 'signature-123',
        verificationChecks: [
          {
            type: 'identity' as const,
            status: 'passed' as const,
            details: 'Identity verified',
            timestamp: '2024-01-15T10:00:00.000Z'
          }
        ],
        auditTrail: [],
        legalValidity: true,
        timestamp: '2024-01-15T10:00:00.000Z'
      };

      mockContractService.processDigitalSignature.mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/contracts/contract-123/signatures/signature-123/sign')
        .send({
          signatureData: 'base64-signature-data',
          verificationCode: 'VERIFY123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should return 400 when signature data is missing', async () => {
      const response = await request(app)
        .post('/api/contracts/contract-123/signatures/signature-123/sign')
        .send({ verificationCode: 'VERIFY123' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('MISSING_SIGNATURE_DATA');
    });

    it('should handle signature processing errors', async () => {
      mockContractService.processDigitalSignature.mockRejectedValue(
        new Error('Invalid verification code')
      );

      const response = await request(app)
        .post('/api/contracts/contract-123/signatures/signature-123/sign')
        .send({
          signatureData: 'base64-signature-data',
          verificationCode: 'WRONG_CODE'
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SIGNATURE_PROCESSING_FAILED');
    });
  });

  describe('POST /api/contracts/:contractId/variations', () => {
    it('should add variation successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456',
        variations: []
      };

      const variationData = {
        description: 'Additional electrical work',
        reason: 'Client request',
        requestedBy: 'homeowner',
        requestedAt: '2024-01-15T10:00:00.000Z',
        status: 'requested',
        costImpact: 5000,
        timeImpact: 7,
        specification: 'Additional power outlets',
        approvalRequired: true,
        documents: []
      };

      const mockUpdatedContract = {
        ...mockContract,
        variations: [{ ...variationData, id: 'var-123', variationNumber: 'VAR-001' }]
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);
      mockContractService.addVariation.mockResolvedValue(mockUpdatedContract as any);

      const response = await request(app)
        .post('/api/contracts/contract-123/variations')
        .send(variationData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.variations).toHaveLength(1);
    });
  });

  describe('PUT /api/contracts/:contractId/milestones/:milestoneId/complete', () => {
    it('should complete milestone successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456',
        milestones: [
          {
            id: 'milestone-123',
            status: 'pending'
          }
        ]
      };

      const mockUpdatedContract = {
        ...mockContract,
        milestones: [
          {
            id: 'milestone-123',
            status: 'completed',
            actualDate: '2024-01-15T10:00:00.000Z'
          }
        ]
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);
      mockContractService.completeMilestone.mockResolvedValue(mockUpdatedContract as any);

      const response = await request(app)
        .put('/api/contracts/contract-123/milestones/milestone-123/complete')
        .send({ notes: 'Milestone completed successfully' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.milestones[0].status).toBe('completed');
    });
  });

  describe('POST /api/contracts/:contractId/payments', () => {
    it('should record payment successfully', async () => {
      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456',
        payments: []
      };

      const paymentData = {
        milestoneId: 'milestone-123',
        amount: 10000,
        currency: 'GBP',
        dueDate: '2024-02-15T00:00:00.000Z',
        status: 'paid',
        retentionHeld: 500,
        netAmount: 9500,
        documents: []
      };

      const mockUpdatedContract = {
        ...mockContract,
        payments: [{ ...paymentData, id: 'payment-123' }]
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);
      mockContractService.recordPayment.mockResolvedValue(mockUpdatedContract as any);

      const response = await request(app)
        .post('/api/contracts/contract-123/payments')
        .send(paymentData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.payments).toHaveLength(1);
    });

    it('should return 403 when builder tries to record payment', async () => {
      // Mock builder user
      mockAuth.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          userId: 'builder-456',
          email: 'builder@example.com',
          userType: 'builder',
          iat: Date.now(),
          exp: Date.now() + 3600000
        };
        next();
      });

      const mockContract = {
        id: 'contract-123',
        homeownerId: 'user-123',
        builderId: 'builder-456'
      };

      mockContractService.getById.mockResolvedValue(mockContract as any);

      const response = await request(app)
        .post('/api/contracts/contract-123/payments')
        .send({
          milestoneId: 'milestone-123',
          amount: 10000,
          currency: 'GBP',
          dueDate: '2024-02-15T00:00:00.000Z',
          status: 'paid',
          retentionHeld: 500,
          netAmount: 9500,
          documents: []
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('GET /api/contracts/homeowner/:homeownerId', () => {
    it('should get homeowner contracts successfully', async () => {
      const mockContracts = [
        { id: 'contract-1', homeownerId: 'user-123', status: 'active' },
        { id: 'contract-2', homeownerId: 'user-123', status: 'completed' }
      ];

      mockContractService.getByHomeownerId.mockResolvedValue(mockContracts as any);

      const response = await request(app)
        .get('/api/contracts/homeowner/user-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContracts);
    });

    it('should filter by status when provided', async () => {
      const mockContracts = [
        { id: 'contract-1', homeownerId: 'user-123', status: 'active' }
      ];

      mockContractService.getByHomeownerId.mockResolvedValue(mockContracts as any);

      const response = await request(app)
        .get('/api/contracts/homeowner/user-123?status=active');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContracts);
      expect(mockContractService.getByHomeownerId).toHaveBeenCalledWith('user-123', 'active');
    });
  });

  describe('GET /api/contracts/builder/:builderId', () => {
    it('should get builder contracts successfully', async () => {
      // Mock builder user
      mockAuth.mockImplementationOnce((req: any, res: any, next: any) => {
        req.user = {
          userId: 'builder-123',
          email: 'builder@example.com',
          userType: 'builder',
          iat: Date.now(),
          exp: Date.now() + 3600000
        };
        next();
      });

      const mockContracts = [
        { id: 'contract-1', builderId: 'builder-123', status: 'active' },
        { id: 'contract-2', builderId: 'builder-123', status: 'completed' }
      ];

      mockContractService.getByBuilderId.mockResolvedValue(mockContracts as any);

      const response = await request(app)
        .get('/api/contracts/builder/builder-123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockContracts);
    });
  });

  describe('GET /api/contracts/statistics/:userId', () => {
    it('should get contract statistics successfully', async () => {
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

      mockContractService.getStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/contracts/statistics/user-123?userType=homeowner');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStats);
    });

    it('should return 400 when userType is invalid', async () => {
      const response = await request(app)
        .get('/api/contracts/statistics/user-123?userType=invalid');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_USER_TYPE');
    });

    it('should return 400 when userType is missing', async () => {
      const response = await request(app)
        .get('/api/contracts/statistics/user-123');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_USER_TYPE');
    });
  });
});