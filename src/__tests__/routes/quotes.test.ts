import request from 'supertest';
import express from 'express';
import quotesRouter from '../../routes/quotes';
import { QuoteService } from '../../services/QuoteService';
import { authenticateToken as authMiddleware } from '../../middleware/auth';
import { JWTPayload } from '../../types';

// Mock dependencies
jest.mock('../../services/QuoteService');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/quotes', quotesRouter);

describe('Quotes Routes', () => {
  let mockQuoteService: jest.Mocked<QuoteService>;
  let mockAuthMiddleware: jest.MockedFunction<typeof authMiddleware>;

  const mockHomeownerUser: JWTPayload = {
    userId: 'homeowner-123',
    email: 'homeowner@test.com',
    userType: 'homeowner',
    iat: 1234567890,
    exp: 1234567890
  };

  const mockBuilderUser: JWTPayload = {
    userId: 'builder-123',
    email: 'builder@test.com',
    userType: 'builder',
    iat: 1234567890,
    exp: 1234567890
  };

  const mockAdminUser: JWTPayload = {
    userId: 'admin-123',
    email: 'admin@test.com',
    userType: 'admin',
    iat: 1234567890,
    exp: 1234567890
  };

  const mockQuoteSubmissionRequest = {
    sowId: 'sow-123',
    builderId: 'builder-123',
    quote: {
      sowId: 'sow-123',
      builderId: 'builder-123',
      builderProfile: {
        companyName: 'Test Builders Ltd',
        address: {
          line1: '123 Builder Street',
          city: 'London',
          county: 'Greater London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        },
        contactPerson: {
          name: 'John Builder',
          title: 'Project Manager',
          phone: '020 1234 5678',
          email: 'john@testbuilders.com'
        },
        specializations: ['extensions'],
        serviceAreas: ['London'],
        rating: {
          overall: 4.5,
          reviewCount: 100,
          qualityScore: 4.5,
          timelinessScore: 4.5,
          communicationScore: 4.5,
          valueScore: 4.5,
          lastUpdated: '2024-01-15T10:00:00Z'
        }
      },
      totalPrice: 10000,
      currency: 'GBP',
      breakdown: [
        {
          id: 'breakdown-1',
          category: 'substructure',
          description: 'Foundation work',
          specification: 'Concrete foundations',
          quantity: 20,
          unit: 'm',
          unitRate: 150,
          totalCost: 3000,
          labourCost: 2000,
          materialCost: 800,
          equipmentCost: 200,
          overheadPercentage: 10,
          profitPercentage: 15
        }
      ],
      timeline: {
        totalDuration: 30,
        phases: [
          {
            id: 'phase-1',
            name: 'Foundation',
            description: 'Foundation work',
            startDay: 1,
            duration: 10,
            dependencies: [],
            resources: [
              {
                type: 'labour',
                description: 'Groundworkers',
                quantity: 3,
                unit: 'days',
                totalCost: 2000,
                availability: 'confirmed',
                critical: true
              }
            ],
            deliverables: ['Foundation complete'],
            milestones: [
              {
                name: 'Foundation complete',
                day: 10,
                description: 'Foundation work finished',
                paymentTrigger: true,
                inspectionRequired: true
              }
            ]
          }
        ],
        criticalPath: ['phase-1'],
        bufferDays: 5,
        weatherDependency: true,
        seasonalFactors: []
      },
      warranty: {
        workmanshipWarranty: {
          duration: 24,
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
        claimsProcess: 'Contact us'
      },
      certifications: [
        {
          name: 'NHBC Registered',
          issuingBody: 'NHBC',
          certificateNumber: 'NHBC123456',
          issueDate: '2023-01-01',
          scope: 'Residential construction',
          verified: true
        }
      ],
      terms: {
        paymentSchedule: {
          type: 'milestone',
          schedule: [
            {
              milestone: 'Start',
              percentage: 50,
              amount: 5000,
              trigger: 'Contract signed',
              documentation: []
            },
            {
              milestone: 'Completion',
              percentage: 50,
              amount: 5000,
              trigger: 'Work completed',
              documentation: []
            }
          ],
          retentionHeld: 5,
          paymentTerms: 14
        },
        variationPolicy: 'Written approval required',
        cancellationPolicy: '14 days notice',
        retentionPercentage: 5,
        retentionPeriod: 12,
        disputeResolution: 'Mediation',
        governingLaw: 'English Law',
        additionalTerms: []
      },
      methodology: 'NRM2',
      complianceStatement: {
        ribaCompliance: true,
        ribaStagesAddressed: [2, 3, 4],
        nrmCompliance: true,
        nrmMethodology: 'NRM2',
        nhbcCompliance: true,
        nhbcChapters: ['Chapter 1.1'],
        ricsCompliance: true,
        ricsStandards: ['RICS NRM2'],
        buildingRegulationsCompliance: true,
        regulationsAddressed: ['Part A'],
        additionalStandards: [],
        complianceNotes: 'All compliant',
        certificationRequired: []
      },
      validUntil: '2024-12-31T23:59:59Z',
      status: 'draft',
      submittedAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      version: 1
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockQuoteService = new QuoteService() as jest.Mocked<QuoteService>;
    mockAuthMiddleware = authMiddleware as jest.MockedFunction<typeof authMiddleware>;
    
    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, res: any, next: any) => {
      req.user = mockBuilderUser; // Default to builder user
      next();
    });
  });

  describe('POST /api/quotes/submit', () => {
    it('should submit quote successfully for builder', async () => {
      mockQuoteService.submitQuote.mockResolvedValueOnce({
        success: true,
        quoteId: 'quote-123',
        quote: { id: 'quote-123' } as any,
        warnings: []
      });

      const response = await request(app)
        .post('/api/quotes/submit')
        .send(mockQuoteSubmissionRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.quoteId).toBe('quote-123');
      expect(mockQuoteService.submitQuote).toHaveBeenCalledWith({
        ...mockQuoteSubmissionRequest,
        builderId: 'builder-123'
      });
    });

    it('should reject submission from non-builder', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const response = await request(app)
        .post('/api/quotes/submit')
        .send(mockQuoteSubmissionRequest)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return validation errors for invalid request', async () => {
      const invalidRequest = {
        ...mockQuoteSubmissionRequest,
        sowId: 'invalid-uuid'
      };

      const response = await request(app)
        .post('/api/quotes/submit')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });

    it('should handle service errors', async () => {
      mockQuoteService.submitQuote.mockResolvedValueOnce({
        success: false,
        validationErrors: [
          {
            field: 'totalPrice',
            message: 'Price is too low',
            code: 'INVALID_PRICE'
          }
        ],
        warnings: []
      });

      const response = await request(app)
        .post('/api/quotes/submit')
        .send(mockQuoteSubmissionRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.validationErrors).toBeDefined();
    });
  });

  describe('GET /api/quotes/:quoteId', () => {
    it('should return quote for authorized user', async () => {
      const mockQuote = {
        id: 'quote-123',
        builderId: 'builder-123',
        totalPrice: 10000
      };

      mockQuoteService.getQuote.mockResolvedValueOnce({
        success: true,
        data: mockQuote as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/quote-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('quote-123');
    });

    it('should reject builder viewing other builder\'s quote', async () => {
      const mockQuote = {
        id: 'quote-123',
        builderId: 'other-builder',
        totalPrice: 10000
      };

      mockQuoteService.getQuote.mockResolvedValueOnce({
        success: true,
        data: mockQuote as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/quote-123')
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should return 404 for non-existent quote', async () => {
      mockQuoteService.getQuote.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found'
        },
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/nonexistent-quote')
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/quotes/sow/:sowId', () => {
    it('should return quotes for homeowner', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const mockQuotes = [
        { id: 'quote-1', builderId: 'builder-1' },
        { id: 'quote-2', builderId: 'builder-2' }
      ];

      mockQuoteService.getQuotesForSoW.mockResolvedValueOnce({
        success: true,
        data: mockQuotes as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/sow/sow-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should reject builder access to SoW quotes', async () => {
      const response = await request(app)
        .get('/api/quotes/sow/sow-123')
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('GET /api/quotes/builder/my-quotes', () => {
    it('should return builder\'s own quotes', async () => {
      const mockQuotes = [
        { id: 'quote-1', builderId: 'builder-123', status: 'submitted' },
        { id: 'quote-2', builderId: 'builder-123', status: 'draft' }
      ];

      mockQuoteService.getBuilderQuotes.mockResolvedValueOnce({
        success: true,
        data: mockQuotes as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/builder/my-quotes')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(mockQuoteService.getBuilderQuotes).toHaveBeenCalledWith('builder-123', undefined);
    });

    it('should filter quotes by status', async () => {
      const mockQuotes = [
        { id: 'quote-1', builderId: 'builder-123', status: 'submitted' }
      ];

      mockQuoteService.getBuilderQuotes.mockResolvedValueOnce({
        success: true,
        data: mockQuotes as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/builder/my-quotes?status=submitted')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockQuoteService.getBuilderQuotes).toHaveBeenCalledWith('builder-123', 'submitted');
    });

    it('should reject non-builder access', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const response = await request(app)
        .get('/api/quotes/builder/my-quotes')
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('PUT /api/quotes/:quoteId/status', () => {
    it('should update quote status for homeowner', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const updatedQuote = {
        id: 'quote-123',
        status: 'selected'
      };

      mockQuoteService.updateQuoteStatus.mockResolvedValueOnce({
        success: true,
        data: updatedQuote as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .put('/api/quotes/quote-123/status')
        .send({ status: 'selected' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('selected');
    });

    it('should reject builder status updates', async () => {
      const response = await request(app)
        .put('/api/quotes/quote-123/status')
        .send({ status: 'selected' })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate status values', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const response = await request(app)
        .put('/api/quotes/quote-123/status')
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/quotes/distribute', () => {
    it('should distribute SoW to builders for homeowner', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const mockDistribution = {
        id: 'dist-123',
        sowId: 'sow-123',
        selectedBuilders: ['builder-1', 'builder-2'],
        status: 'active'
      };

      mockQuoteService.distributeToBuilders.mockResolvedValueOnce({
        success: true,
        data: mockDistribution as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .post('/api/quotes/distribute')
        .send({
          sowId: 'sow-123',
          builderIds: ['builder-1', 'builder-2'],
          dueDate: '2024-02-15T23:59:59Z'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.selectedBuilders).toEqual(['builder-1', 'builder-2']);
    });

    it('should reject non-homeowner distribution', async () => {
      const response = await request(app)
        .post('/api/quotes/distribute')
        .send({
          sowId: 'sow-123',
          builderIds: ['builder-1'],
          dueDate: '2024-02-15T23:59:59Z'
        })
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate distribution request', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const response = await request(app)
        .post('/api/quotes/distribute')
        .send({
          sowId: 'invalid-uuid',
          builderIds: [],
          dueDate: 'invalid-date'
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/quotes/compare/:sowId', () => {
    it('should return quote comparison for homeowner', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const mockComparison = {
        sowId: 'sow-123',
        quotes: [
          { id: 'quote-1', totalPrice: 10000 },
          { id: 'quote-2', totalPrice: 12000 }
        ],
        comparisonMetrics: {
          priceRange: {
            lowest: 10000,
            highest: 12000,
            average: 11000,
            median: 11000
          }
        },
        recommendations: []
      };

      mockQuoteService.compareQuotes.mockResolvedValueOnce({
        success: true,
        data: mockComparison as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/compare/sow-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.quotes).toHaveLength(2);
    });

    it('should reject builder access to comparisons', async () => {
      const response = await request(app)
        .get('/api/quotes/compare/sow-123')
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('POST /api/quotes/communication', () => {
    it('should create communication for homeowner', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const mockCommunication = {
        id: 'comm-123',
        type: 'clarification-request',
        subject: 'Question about materials',
        status: 'sent'
      };

      mockQuoteService.createCommunication.mockResolvedValueOnce({
        success: true,
        data: mockCommunication as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .post('/api/quotes/communication')
        .send({
          sowId: 'sow-123',
          builderId: 'builder-123',
          type: 'clarification-request',
          subject: 'Question about materials',
          message: 'Can you clarify the brick specification?'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('clarification-request');
    });

    it('should validate communication request', async () => {
      mockAuthMiddleware.mockImplementationOnce((req: any, res, next) => {
        req.user = mockHomeownerUser;
        next();
      });

      const response = await request(app)
        .post('/api/quotes/communication')
        .send({
          sowId: 'invalid-uuid',
          builderId: 'invalid-uuid',
          type: 'invalid-type',
          subject: '',
          message: ''
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });

  describe('GET /api/quotes/communication/:sowId', () => {
    it('should return communications for SoW', async () => {
      const mockCommunications = [
        {
          id: 'comm-1',
          type: 'clarification-request',
          subject: 'Question 1'
        },
        {
          id: 'comm-2',
          type: 'response',
          subject: 'Answer 1'
        }
      ];

      mockQuoteService.getCommunications.mockResolvedValueOnce({
        success: true,
        data: mockCommunications as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-123'
      });

      const response = await request(app)
        .get('/api/quotes/communication/sow-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });
  });

  describe('error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockQuoteService.submitQuote.mockRejectedValueOnce(new Error('Service error'));

      const response = await request(app)
        .post('/api/quotes/submit')
        .send(mockQuoteSubmissionRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/quotes/submit')
        .send({
          sowId: 'invalid-uuid',
          quote: {
            totalPrice: 'not-a-number'
          }
        })
        .expect(400);

      expect(response.body.errors).toBeDefined();
    });
  });
});