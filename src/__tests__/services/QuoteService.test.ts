import { QuoteService } from '../../services/QuoteService';
import { QuoteModel } from '../../models/Quote';
import { 
  QuoteSubmissionRequest, 
  Quote, 
  ScopeOfWork, 
  QuoteStatus,
  BuilderProfile,
  QuoteBreakdown,
  QuoteTimeline,
  WarrantyDetails,
  BuilderCertification,
  QuoteTerms,
  ComplianceStatement
} from '../../types';

// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('QuoteService', () => {
  let quoteService: QuoteService;
  let mockDynamoClient: any;

  const mockBuilderProfile: BuilderProfile = {
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
  };

  const mockBreakdown: QuoteBreakdown[] = [
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
  ];

  const mockTimeline: QuoteTimeline = {
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
  };

  const mockWarranty: WarrantyDetails = {
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
  };

  const mockCertifications: BuilderCertification[] = [
    {
      name: 'NHBC Registered',
      issuingBody: 'NHBC',
      certificateNumber: 'NHBC123456',
      issueDate: '2023-01-01',
      scope: 'Residential construction',
      verified: true
    }
  ];

  const mockTerms: QuoteTerms = {
    paymentSchedule: {
      type: 'milestone',
      schedule: [
        {
          milestone: 'Start',
          percentage: 50,
          amount: 1500,
          trigger: 'Contract signed',
          documentation: []
        },
        {
          milestone: 'Completion',
          percentage: 50,
          amount: 1500,
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
  };

  const mockComplianceStatement: ComplianceStatement = {
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
  };

  const mockQuoteSubmissionRequest: QuoteSubmissionRequest = {
    sowId: 'sow-123',
    builderId: 'builder-123',
    quote: {
      sowId: 'sow-123',
      builderId: 'builder-123',
      builderProfile: mockBuilderProfile,
      totalPrice: 25000, // Updated to match all NRM2 elements
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
          totalCost: 5000,
          labourCost: 3000,
          materialCost: 1500,
          equipmentCost: 500,
          overheadPercentage: 10,
          profitPercentage: 15
        },
        {
          id: 'breakdown-2',
          category: 'superstructure',
          description: 'Wall construction',
          specification: 'Cavity wall construction',
          quantity: 50,
          unit: 'm²',
          unitRate: 120,
          totalCost: 6000,
          labourCost: 4000,
          materialCost: 1500,
          equipmentCost: 500,
          overheadPercentage: 10,
          profitPercentage: 15
        },
        {
          id: 'breakdown-3',
          category: 'internal-finishes',
          description: 'Internal finishes',
          specification: 'Plastering and decoration',
          quantity: 100,
          unit: 'm²',
          unitRate: 50,
          totalCost: 5000,
          labourCost: 3000,
          materialCost: 1500,
          equipmentCost: 500,
          overheadPercentage: 10,
          profitPercentage: 15
        },
        {
          id: 'breakdown-4',
          category: 'services',
          description: 'Electrical and plumbing',
          specification: 'Full electrical and plumbing installation',
          quantity: 1,
          unit: 'item',
          unitRate: 8000,
          totalCost: 8000,
          labourCost: 5000,
          materialCost: 2500,
          equipmentCost: 500,
          overheadPercentage: 10,
          profitPercentage: 15
        },
        {
          id: 'breakdown-5',
          category: 'preliminaries',
          description: 'Site setup and management',
          specification: 'Site facilities and management',
          quantity: 1,
          unit: 'item',
          unitRate: 1000,
          totalCost: 1000,
          labourCost: 600,
          materialCost: 300,
          equipmentCost: 100,
          overheadPercentage: 10,
          profitPercentage: 15
        }
      ],
      timeline: mockTimeline,
      warranty: mockWarranty,
      certifications: mockCertifications,
      terms: {
        paymentSchedule: {
          type: 'milestone',
          schedule: [
            {
              milestone: 'Start',
              percentage: 50,
              amount: 12500,
              trigger: 'Contract signed',
              documentation: []
            },
            {
              milestone: 'Completion',
              percentage: 50,
              amount: 12500,
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
      complianceStatement: mockComplianceStatement,
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
      status: 'draft',
      submittedAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z'
    }
  };

  const mockSoW: ScopeOfWork = {
    PK: 'SOW#sow-123',
    SK: 'METADATA',
    id: 'sow-123',
    projectId: 'project-123',
    version: 1,
    ribaStages: [],
    specifications: [],
    materials: {
      categories: [],
      totalEstimatedCost: 0,
      currency: 'GBP',
      lastUpdated: '2024-01-15T10:00:00Z',
      supplierRecommendations: [],
      sustainabilityScore: 0,
      aiGenerated: false
    },
    costEstimate: {
      id: 'cost-123',
      projectId: 'project-123',
      methodology: 'NRM2',
      totalCost: 3000,
      currency: 'GBP',
      breakdown: [],
      confidence: {
        overall: 0.8,
        dataQuality: 0.8,
        marketStability: 0.8,
        projectComplexity: 0.8,
        timeHorizon: 0.8,
        explanation: 'Good confidence',
        factors: []
      },
      marketRates: {
        region: 'London',
        lastUpdated: '2024-01-15T10:00:00Z',
        source: 'Market data',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: '2024-01-15T10:00:00Z',
      validUntil: '2024-12-31T23:59:59Z',
      version: 1,
      status: 'approved'
    },
    complianceChecks: [],
    workPhases: [],
    deliverables: [],
    generatedAt: '2024-01-15T10:00:00Z',
    status: 'approved',
    aiGenerationMetadata: {
      model: 'claude-3.5-sonnet',
      version: '1.0',
      promptVersion: '1.0',
      generationTime: 1000,
      tokensUsed: 1000,
      confidence: 0.9,
      iterationsRequired: 1,
      validationPassed: true,
      knowledgeBaseSources: [],
      customizations: []
    },
    validationResults: []
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock DynamoDB client
    mockDynamoClient = {
      send: jest.fn()
    };

    // Mock the DynamoDB document client creation
    const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
    DynamoDBDocumentClient.from = jest.fn().mockReturnValue(mockDynamoClient);

    quoteService = new QuoteService();
  });

  describe('submitQuote', () => {
    it('should successfully submit a valid quote', async () => {
      // Mock SoW exists
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockSoW }) // getSoW call
        .mockResolvedValueOnce({ Items: [] }) // check existing quote
        .mockResolvedValueOnce({}); // save quote

      const result = await quoteService.submitQuote(mockQuoteSubmissionRequest);

      expect(result.success).toBe(true);
      expect(result.quoteId).toBeDefined();
      expect(result.quote).toBeDefined();
      expect(result.validationErrors).toBeUndefined();
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3);
    });

    it('should return validation errors for invalid quote', async () => {
      const invalidRequest = {
        ...mockQuoteSubmissionRequest,
        quote: {
          ...mockQuoteSubmissionRequest.quote,
          totalPrice: -100 // Invalid price
        }
      };

      const result = await quoteService.submitQuote(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors!.length).toBeGreaterThan(0);
    });

    it('should return error if SoW not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await quoteService.submitQuote(mockQuoteSubmissionRequest);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContainEqual({
        field: 'sowId',
        message: 'SoW not found or not available for quoting',
        code: 'SOW_NOT_FOUND'
      });
    });

    it('should return error if builder already has quote for SoW', async () => {
      const existingQuote = QuoteModel.create(mockQuoteSubmissionRequest.quote);
      
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockSoW }) // getSoW call
        .mockResolvedValueOnce({ Items: [existingQuote] }); // existing quote found

      const result = await quoteService.submitQuote(mockQuoteSubmissionRequest);

      expect(result.success).toBe(false);
      expect(result.validationErrors).toContainEqual({
        field: 'builderId',
        message: 'Builder already has a quote for this SoW',
        code: 'DUPLICATE_QUOTE'
      });
    });
  });

  describe('getQuote', () => {
    it('should return quote when found', async () => {
      const mockQuote = QuoteModel.create(mockQuoteSubmissionRequest.quote);
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [mockQuote] });

      const result = await quoteService.getQuote('quote-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe(mockQuote.id);
    });

    it('should return error when quote not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await quoteService.getQuote('nonexistent-quote');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('QUOTE_NOT_FOUND');
    });
  });

  describe('getQuotesForSoW', () => {
    it('should return all quotes for a SoW', async () => {
      const mockQuotes = [
        QuoteModel.create(mockQuoteSubmissionRequest.quote),
        QuoteModel.create({ ...mockQuoteSubmissionRequest.quote, builderId: 'builder-456' })
      ];
      
      mockDynamoClient.send.mockResolvedValueOnce({ Items: mockQuotes });

      const result = await quoteService.getQuotesForSoW('sow-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data![0]).not.toHaveProperty('GSI3PK');
    });

    it('should return empty array when no quotes found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await quoteService.getQuotesForSoW('sow-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('getBuilderQuotes', () => {
    it('should return builder quotes without status filter', async () => {
      const mockQuotes = [
        QuoteModel.create(mockQuoteSubmissionRequest.quote)
      ];
      
      mockDynamoClient.send.mockResolvedValueOnce({ Items: mockQuotes });

      const result = await quoteService.getBuilderQuotes('builder-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :pk',
          ExpressionAttributeValues: { ':pk': 'builder-123' }
        })
      );
    });

    it('should return builder quotes with status filter', async () => {
      const mockQuotes = [
        QuoteModel.updateStatus(QuoteModel.create(mockQuoteSubmissionRequest.quote), 'submitted')
      ];
      
      mockDynamoClient.send.mockResolvedValueOnce({ Items: mockQuotes });

      const result = await quoteService.getBuilderQuotes('builder-123', 'submitted');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          KeyConditionExpression: 'GSI3PK = :pk AND begins_with(GSI3SK, :status)',
          ExpressionAttributeValues: { 
            ':pk': 'builder-123',
            ':status': 'submitted'
          }
        })
      );
    });
  });

  describe('updateQuoteStatus', () => {
    it('should update quote status successfully', async () => {
      const originalQuote = QuoteModel.create(mockQuoteSubmissionRequest.quote);
      const updatedQuote = QuoteModel.updateStatus(originalQuote, 'under-review');

      mockDynamoClient.send
        .mockResolvedValueOnce({ Items: [originalQuote] }) // getQuote
        .mockResolvedValueOnce({}); // update quote

      const result = await quoteService.updateQuoteStatus('quote-123', 'under-review');

      expect(result.success).toBe(true);
      expect(result.data!.status).toBe('under-review');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should return error when quote not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await quoteService.updateQuoteStatus('nonexistent-quote', 'selected');

      expect(result.success).toBe(false);
    });
  });

  describe('distributeToBuilders', () => {
    it('should successfully distribute SoW to builders', async () => {
      mockDynamoClient.send
        .mockResolvedValueOnce({ Item: mockSoW }) // getSoW
        .mockResolvedValueOnce({}); // save distribution

      const result = await quoteService.distributeToBuilders(
        'sow-123',
        'homeowner-123',
        ['builder-1', 'builder-2'],
        '2024-02-15T23:59:59Z'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.selectedBuilders).toEqual(['builder-1', 'builder-2']);
      expect(result.data!.status).toBe('active');
    });

    it('should return error if SoW not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Item: null });

      const result = await quoteService.distributeToBuilders(
        'nonexistent-sow',
        'homeowner-123',
        ['builder-1'],
        '2024-02-15T23:59:59Z'
      );

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('SOW_NOT_FOUND');
    });
  });

  describe('compareQuotes', () => {
    it('should compare quotes successfully', async () => {
      const quote1 = QuoteModel.create({ ...mockQuoteSubmissionRequest.quote, totalPrice: 3000 });
      const quote2 = QuoteModel.create({ 
        ...mockQuoteSubmissionRequest.quote, 
        builderId: 'builder-456',
        totalPrice: 4000,
        timeline: { ...mockTimeline, totalDuration: 20 }
      });

      mockDynamoClient.send.mockResolvedValueOnce({ Items: [quote1, quote2] });

      const result = await quoteService.compareQuotes('sow-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.quotes).toHaveLength(2);
      expect(result.data!.comparisonMetrics.priceRange.lowest).toBe(3000);
      expect(result.data!.comparisonMetrics.priceRange.highest).toBe(4000);
      expect(result.data!.recommendations).toBeDefined();
      expect(result.data!.recommendations.length).toBeGreaterThan(0);
    });

    it('should return error when no quotes found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await quoteService.compareQuotes('sow-123');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NO_QUOTES_FOUND');
    });
  });

  describe('createCommunication', () => {
    it('should create communication successfully', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});

      const result = await quoteService.createCommunication(
        'sow-123',
        'builder-123',
        'homeowner-123',
        'clarification-request',
        'Question about materials',
        'Can you clarify the brick specification?'
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.type).toBe('clarification-request');
      expect(result.data!.subject).toBe('Question about materials');
      expect(result.data!.status).toBe('sent');
    });
  });

  describe('getCommunications', () => {
    it('should return communications for SoW', async () => {
      const mockCommunications = [
        {
          PK: 'SOW#sow-123',
          SK: 'COMMUNICATION#comm-1',
          id: 'comm-1',
          sowId: 'sow-123',
          builderId: 'builder-123',
          homeownerId: 'homeowner-123',
          type: 'clarification-request',
          subject: 'Test question',
          message: 'Test message',
          status: 'sent',
          priority: 'medium',
          createdAt: '2024-01-15T10:00:00Z'
        }
      ];

      mockDynamoClient.send.mockResolvedValueOnce({ Items: mockCommunications });

      const result = await quoteService.getCommunications('sow-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].type).toBe('clarification-request');
    });

    it('should return empty array when no communications found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({ Items: [] });

      const result = await quoteService.getCommunications('sow-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle DynamoDB errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(quoteService.getQuote('quote-123')).rejects.toThrow('DynamoDB error');
    });

    it('should handle network errors gracefully', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('Network error'));

      await expect(quoteService.submitQuote(mockQuoteSubmissionRequest)).rejects.toThrow('Network error');
    });
  });
});