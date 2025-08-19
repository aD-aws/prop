import request from 'supertest';
import app from '../../app';
import { QuoteService } from '../../services/QuoteService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { ProjectService } from '../../services/ProjectService';
import { AuthService } from '../../services/AuthService';

// Mock external services
jest.mock('../../services/QuoteService');
jest.mock('../../services/SoWGenerationService');
jest.mock('../../services/ProjectService');
jest.mock('../../services/AuthService');
jest.mock('../../middleware/auth');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Quote Management Workflow Integration Tests', () => {
  let mockQuoteService: jest.Mocked<QuoteService>;
  let mockSoWService: jest.Mocked<SoWGenerationService>;
  let mockProjectService: jest.Mocked<ProjectService>;
  let mockAuthService: jest.Mocked<AuthService>;

  const mockHomeownerToken = 'mock-homeowner-token';
  const mockBuilderToken = 'mock-builder-token';

  const mockHomeownerUser = {
    userId: 'homeowner-123',
    email: 'homeowner@test.com',
    userType: 'homeowner',
    iat: 1234567890,
    exp: 1234567890
  };

  const mockBuilderUser = {
    userId: 'builder-123',
    email: 'builder@test.com',
    userType: 'builder',
    iat: 1234567890,
    exp: 1234567890
  };

  const mockProject = {
    id: 'project-123',
    ownerId: 'homeowner-123',
    projectType: 'rear-extension',
    status: 'sow-generation',
    sowId: 'sow-123'
  };

  const mockSoW = {
    id: 'sow-123',
    projectId: 'project-123',
    status: 'approved',
    totalCost: 25000,
    ribaStages: [
      {
        stage: 2,
        title: 'Concept Design',
        description: 'Initial design concepts',
        deliverables: ['Concept drawings'],
        duration: 10,
        dependencies: []
      }
    ]
  };

  const mockQuote = {
    id: 'quote-123',
    sowId: 'sow-123',
    builderId: 'builder-123',
    totalPrice: 28000,
    status: 'submitted',
    timeline: {
      totalDuration: 45,
      phases: [
        {
          id: 'phase-1',
          name: 'Foundation',
          startDay: 1,
          duration: 10
        }
      ]
    },
    warranty: {
      workmanshipWarranty: {
        duration: 24,
        unit: 'months'
      }
    }
  };

  const mockDistribution = {
    id: 'dist-123',
    sowId: 'sow-123',
    selectedBuilders: ['builder-123', 'builder-456'],
    status: 'active'
  };

  const mockComparison = {
    sowId: 'sow-123',
    quotes: [mockQuote],
    comparisonMetrics: {
      priceRange: {
        lowest: 25000,
        highest: 30000,
        average: 27500,
        median: 27500
      }
    },
    recommendations: [
      {
        type: 'best-value',
        quoteId: 'quote-123',
        reason: 'Best balance of price and quality',
        score: 85
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock services
    mockQuoteService = new QuoteService() as jest.Mocked<QuoteService>;
    mockSoWService = new SoWGenerationService() as jest.Mocked<SoWGenerationService>;
    mockProjectService = new ProjectService() as jest.Mocked<ProjectService>;
    mockAuthService = new AuthService() as jest.Mocked<AuthService>;

    // Mock auth middleware for integration tests
    const { authenticateToken } = require('../../middleware/auth');
    jest.mocked(authenticateToken).mockImplementation((req: any, res: any, next: any) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];
      
      if (token === mockHomeownerToken) {
        req.user = mockHomeownerUser;
      } else if (token === mockBuilderToken) {
        req.user = mockBuilderUser;
      } else {
        return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
      }
      next();
    });
  });

  describe('Complete Quote Workflow', () => {
    it('should complete full quote workflow from SoW distribution to selection', async () => {
      // Step 1: Homeowner distributes SoW to builders
      mockQuoteService.distributeToBuilders.mockResolvedValueOnce({
        success: true,
        data: mockDistribution as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-1'
      });

      const distributionResponse = await request(app)
        .post('/api/quotes/distribute')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .send({
          sowId: 'sow-123',
          builderIds: ['builder-123', 'builder-456'],
          dueDate: '2024-02-15T23:59:59Z'
        })
        .expect(201);

      expect(distributionResponse.body.success).toBe(true);
      expect(distributionResponse.body.data.selectedBuilders).toHaveLength(2);

      // Step 2: Builder submits quote
      mockQuoteService.submitQuote.mockResolvedValueOnce({
        success: true,
        quoteId: 'quote-123',
        quote: mockQuote as any,
        warnings: []
      });

      const quoteSubmissionResponse = await request(app)
        .post('/api/quotes/submit')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({
          sowId: 'sow-123',
          quote: {
            sowId: 'sow-123',
            builderId: 'builder-123',
            totalPrice: 28000,
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
            timeline: mockQuote.timeline,
            warranty: mockQuote.warranty,
            certifications: [],
            terms: {
              paymentSchedule: {
                type: 'milestone',
                schedule: [
                  {
                    milestone: 'Start',
                    percentage: 50,
                    amount: 14000,
                    trigger: 'Contract signed',
                    documentation: []
                  },
                  {
                    milestone: 'Completion',
                    percentage: 50,
                    amount: 14000,
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
            }
          }
        })
        .expect(201);

      expect(quoteSubmissionResponse.body.success).toBe(true);
      expect(quoteSubmissionResponse.body.quoteId).toBe('quote-123');

      // Step 3: Homeowner views quotes for SoW
      mockQuoteService.getQuotesForSoW.mockResolvedValueOnce({
        success: true,
        data: [mockQuote] as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-3'
      });

      const quotesResponse = await request(app)
        .get('/api/quotes/sow/sow-123')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .expect(200);

      expect(quotesResponse.body.success).toBe(true);
      expect(quotesResponse.body.data).toHaveLength(1);

      // Step 4: Homeowner compares quotes
      mockQuoteService.compareQuotes.mockResolvedValueOnce({
        success: true,
        data: mockComparison as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-4'
      });

      const comparisonResponse = await request(app)
        .get('/api/quotes/compare/sow-123')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .expect(200);

      expect(comparisonResponse.body.success).toBe(true);
      expect(comparisonResponse.body.data.recommendations).toHaveLength(1);

      // Step 5: Homeowner selects quote
      mockQuoteService.updateQuoteStatus.mockResolvedValueOnce({
        success: true,
        data: { ...mockQuote, status: 'selected' } as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-5'
      });

      const selectionResponse = await request(app)
        .put('/api/quotes/quote-123/status')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .send({ status: 'selected' })
        .expect(200);

      expect(selectionResponse.body.success).toBe(true);
      expect(selectionResponse.body.data.status).toBe('selected');

      // Verify all service calls were made correctly
      expect(mockQuoteService.distributeToBuilders).toHaveBeenCalledWith(
        'sow-123',
        'homeowner-123',
        ['builder-123', 'builder-456'],
        '2024-02-15T23:59:59Z'
      );
      expect(mockQuoteService.submitQuote).toHaveBeenCalled();
      expect(mockQuoteService.getQuotesForSoW).toHaveBeenCalledWith('sow-123');
      expect(mockQuoteService.compareQuotes).toHaveBeenCalledWith('sow-123');
      expect(mockQuoteService.updateQuoteStatus).toHaveBeenCalledWith('quote-123', 'selected');
    });

    it('should handle builder communication workflow', async () => {
      // Step 1: Builder asks clarification question
      mockQuoteService.createCommunication.mockResolvedValueOnce({
        success: true,
        data: {
          id: 'comm-123',
          type: 'clarification-request',
          subject: 'Material specification question',
          message: 'Can you clarify the brick type?',
          status: 'sent'
        } as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-1'
      });

      const communicationResponse = await request(app)
        .post('/api/quotes/communication')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({
          sowId: 'sow-123',
          builderId: 'builder-123',
          type: 'clarification-request',
          subject: 'Material specification question',
          message: 'Can you clarify the brick type for the extension?'
        })
        .expect(201);

      expect(communicationResponse.body.success).toBe(true);
      expect(communicationResponse.body.data.type).toBe('clarification-request');

      // Step 2: View communications
      mockQuoteService.getCommunications.mockResolvedValueOnce({
        success: true,
        data: [
          {
            id: 'comm-123',
            type: 'clarification-request',
            subject: 'Material specification question',
            status: 'sent'
          }
        ] as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-2'
      });

      const communicationsResponse = await request(app)
        .get('/api/quotes/communication/sow-123')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .expect(200);

      expect(communicationsResponse.body.success).toBe(true);
      expect(communicationsResponse.body.data).toHaveLength(1);
    });

    it('should handle builder quote management workflow', async () => {
      // Step 1: Builder views their own quotes
      mockQuoteService.getBuilderQuotes.mockResolvedValueOnce({
        success: true,
        data: [mockQuote] as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-1'
      });

      const builderQuotesResponse = await request(app)
        .get('/api/quotes/builder/my-quotes')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(200);

      expect(builderQuotesResponse.body.success).toBe(true);
      expect(builderQuotesResponse.body.data).toHaveLength(1);

      // Step 2: Builder views specific quote
      mockQuoteService.getQuote.mockResolvedValueOnce({
        success: true,
        data: mockQuote as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-2'
      });

      const quoteResponse = await request(app)
        .get('/api/quotes/quote-123')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(200);

      expect(quoteResponse.body.success).toBe(true);
      expect(quoteResponse.body.data.id).toBe('quote-123');

      // Step 3: Filter quotes by status
      mockQuoteService.getBuilderQuotes.mockResolvedValueOnce({
        success: true,
        data: [{ ...mockQuote, status: 'submitted' }] as any,
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-3'
      });

      const filteredQuotesResponse = await request(app)
        .get('/api/quotes/builder/my-quotes?status=submitted')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(200);

      expect(filteredQuotesResponse.body.success).toBe(true);
      expect(mockQuoteService.getBuilderQuotes).toHaveBeenLastCalledWith('builder-123', 'submitted');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle quote submission validation errors', async () => {
      mockQuoteService.submitQuote.mockResolvedValueOnce({
        success: false,
        validationErrors: [
          {
            field: 'totalPrice',
            message: 'Total price must be greater than 0',
            code: 'INVALID_VALUE'
          }
        ],
        warnings: []
      });

      const response = await request(app)
        .post('/api/quotes/submit')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({
          sowId: 'sow-123',
          quote: {
            totalPrice: -100 // Invalid price
          }
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.validationErrors).toBeDefined();
    });

    it('should handle unauthorized access attempts', async () => {
      // Builder trying to view all quotes for SoW
      const response = await request(app)
        .get('/api/quotes/sow/sow-123')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should handle non-existent resource requests', async () => {
      mockQuoteService.getQuote.mockResolvedValueOnce({
        success: false,
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found'
        },
        timestamp: '2024-01-15T10:00:00Z',
        requestId: 'req-1'
      });

      const response = await request(app)
        .get('/api/quotes/nonexistent-quote')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('QUOTE_NOT_FOUND');
    });

    it('should handle service errors gracefully', async () => {
      mockQuoteService.submitQuote.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/quotes/submit')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({
          sowId: 'sow-123',
          quote: {
            totalPrice: 10000
          }
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });
  });

  describe('Permission and Security Tests', () => {
    it('should enforce proper access controls', async () => {
      // Test homeowner cannot submit quotes
      const homeownerSubmitResponse = await request(app)
        .post('/api/quotes/submit')
        .set('Authorization', `Bearer ${mockHomeownerToken}`)
        .send({ sowId: 'sow-123' })
        .expect(403);

      expect(homeownerSubmitResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Test builder cannot update quote status
      const builderStatusResponse = await request(app)
        .put('/api/quotes/quote-123/status')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({ status: 'selected' })
        .expect(403);

      expect(builderStatusResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');

      // Test builder cannot distribute SoWs
      const builderDistributeResponse = await request(app)
        .post('/api/quotes/distribute')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({
          sowId: 'sow-123',
          builderIds: ['builder-456'],
          dueDate: '2024-02-15T23:59:59Z'
        })
        .expect(403);

      expect(builderDistributeResponse.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should validate input data properly', async () => {
      // Test invalid UUID validation
      const invalidUuidResponse = await request(app)
        .get('/api/quotes/invalid-uuid')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .expect(400);

      expect(invalidUuidResponse.body.errors).toBeDefined();

      // Test missing required fields
      const missingFieldsResponse = await request(app)
        .post('/api/quotes/submit')
        .set('Authorization', `Bearer ${mockBuilderToken}`)
        .send({})
        .expect(400);

      expect(missingFieldsResponse.body.errors).toBeDefined();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent quote submissions', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        mockQuoteService.submitQuote.mockResolvedValueOnce({
          success: true,
          quoteId: `quote-${i}`,
          quote: { ...mockQuote, id: `quote-${i}` } as any,
          warnings: []
        });

        promises.push(
          request(app)
            .post('/api/quotes/submit')
            .set('Authorization', `Bearer ${mockBuilderToken}`)
            .send({
              sowId: `sow-${i}`,
              quote: {
                sowId: `sow-${i}`,
                builderId: 'builder-123',
                totalPrice: 10000 + i * 1000,
                breakdown: [],
                timeline: mockQuote.timeline,
                warranty: mockQuote.warranty,
                certifications: [],
                terms: {
                  paymentSchedule: {
                    type: 'milestone',
                    schedule: [],
                    retentionHeld: 5,
                    paymentTerms: 14
                  },
                  variationPolicy: 'Written approval',
                  cancellationPolicy: '14 days',
                  retentionPercentage: 5,
                  retentionPeriod: 12,
                  disputeResolution: 'Mediation',
                  governingLaw: 'English Law',
                  additionalTerms: []
                },
                methodology: 'NRM2',
                complianceStatement: {
                  ribaCompliance: true,
                  ribaStagesAddressed: [],
                  nrmCompliance: true,
                  nrmMethodology: 'NRM2',
                  nhbcCompliance: true,
                  nhbcChapters: [],
                  ricsCompliance: true,
                  ricsStandards: [],
                  buildingRegulationsCompliance: true,
                  regulationsAddressed: [],
                  additionalStandards: [],
                  complianceNotes: '',
                  certificationRequired: []
                },
                validUntil: '2024-12-31T23:59:59Z',
                builderProfile: {
                  companyName: 'Test Builders',
                  address: {
                    line1: '123 Street',
                    city: 'London',
                    county: 'London',
                    postcode: 'SW1A 1AA',
                    country: 'UK'
                  },
                  contactPerson: {
                    name: 'John',
                    title: 'Manager',
                    phone: '123456789',
                    email: 'john@test.com'
                  },
                  specializations: [],
                  serviceAreas: [],
                  rating: {
                    overall: 4.5,
                    reviewCount: 100,
                    qualityScore: 4.5,
                    timelinessScore: 4.5,
                    communicationScore: 4.5,
                    valueScore: 4.5,
                    lastUpdated: '2024-01-15T10:00:00Z'
                  }
                }
              }
            })
            .expect(201)
        );
      }

      const responses = await Promise.all(promises);
      
      responses.forEach((response, index) => {
        expect(response.body.success).toBe(true);
        expect(response.body.quoteId).toBe(`quote-${index}`);
      });
    });
  });
});