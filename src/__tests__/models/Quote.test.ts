import { QuoteModel } from '../../models/Quote';
import { 
  Quote, 
  QuoteStatus, 
  QuoteBreakdown, 
  QuoteTimeline, 
  WarrantyDetails, 
  BuilderCertification, 
  QuoteTerms, 
  ComplianceStatement, 
  BuilderProfile,
  NRM2Element
} from '../../types';

describe('QuoteModel', () => {
  const mockBuilderProfile: BuilderProfile = {
    companyName: 'Test Builders Ltd',
    tradingName: 'Test Builders',
    registrationNumber: '12345678',
    vatNumber: 'GB123456789',
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
    establishedYear: 2010,
    employeeCount: 25,
    specializations: ['extensions', 'renovations'],
    serviceAreas: ['London', 'Surrey'],
    rating: {
      overall: 4.5,
      reviewCount: 150,
      qualityScore: 4.6,
      timelinessScore: 4.4,
      communicationScore: 4.5,
      valueScore: 4.3,
      lastUpdated: '2024-01-15T10:00:00Z'
    }
  };

  const mockBreakdown: QuoteBreakdown[] = [
    {
      id: 'breakdown-1',
      category: 'substructure' as NRM2Element,
      description: 'Foundation work',
      specification: 'Concrete strip foundations',
      quantity: 20,
      unit: 'm',
      unitRate: 150,
      totalCost: 3000,
      labourCost: 2000,
      materialCost: 800,
      equipmentCost: 200,
      overheadPercentage: 10,
      profitPercentage: 15
    },
    {
      id: 'breakdown-2',
      category: 'superstructure' as NRM2Element,
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
      category: 'internal-finishes' as NRM2Element,
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
      category: 'services' as NRM2Element,
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
      category: 'preliminaries' as NRM2Element,
      description: 'Site setup and management',
      specification: 'Site facilities and management',
      quantity: 1,
      unit: 'item',
      unitRate: 3000,
      totalCost: 3000,
      labourCost: 2000,
      materialCost: 800,
      equipmentCost: 200,
      overheadPercentage: 10,
      profitPercentage: 15
    }
  ];

  const mockTimeline: QuoteTimeline = {
    totalDuration: 45,
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
            dailyRate: 200,
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
    seasonalFactors: ['Winter weather delays possible']
  };

  const mockWarranty: WarrantyDetails = {
    workmanshipWarranty: {
      duration: 24,
      unit: 'months',
      coverage: 'All workmanship defects',
      limitations: ['Normal wear and tear excluded']
    },
    materialsWarranty: {
      duration: 12,
      unit: 'months',
      coverage: 'Material defects',
      limitations: ['Manufacturer warranties apply']
    },
    exclusions: ['Acts of God', 'Misuse'],
    conditions: ['Annual inspection required'],
    insuranceBacked: true,
    insuranceProvider: 'BuildSure Insurance',
    claimsProcess: 'Contact us within 30 days'
  };

  const mockCertifications: BuilderCertification[] = [
    {
      name: 'NHBC Registered',
      issuingBody: 'NHBC',
      certificateNumber: 'NHBC123456',
      issueDate: '2023-01-01',
      expiryDate: '2024-12-31',
      scope: 'Residential construction',
      verified: true,
      verificationDate: '2023-01-15'
    }
  ];

  const mockTerms: QuoteTerms = {
    paymentSchedule: {
      type: 'milestone',
      schedule: [
        {
          milestone: 'Start',
          percentage: 20,
          amount: 1800,
          trigger: 'Contract signed',
          documentation: ['Signed contract']
        },
        {
          milestone: 'Foundation complete',
          percentage: 30,
          amount: 2700,
          trigger: 'Foundation inspection passed',
          documentation: ['Building control approval']
        },
        {
          milestone: 'Completion',
          percentage: 50,
          amount: 4500,
          trigger: 'Work completed',
          documentation: ['Final inspection certificate']
        }
      ],
      retentionHeld: 5,
      paymentTerms: 14,
      lateFees: {
        type: 'percentage',
        rate: 2,
        gracePeriod: 7,
        compounding: false
      }
    },
    variationPolicy: 'Written approval required',
    cancellationPolicy: '14 days notice required',
    retentionPercentage: 5,
    retentionPeriod: 12,
    disputeResolution: 'Mediation then arbitration',
    governingLaw: 'English Law',
    additionalTerms: ['Site access required 8am-6pm']
  };

  const mockComplianceStatement: ComplianceStatement = {
    ribaCompliance: true,
    ribaStagesAddressed: [2, 3, 4, 5],
    nrmCompliance: true,
    nrmMethodology: 'NRM2',
    nhbcCompliance: true,
    nhbcChapters: ['Chapter 1.1', 'Chapter 2.1'],
    ricsCompliance: true,
    ricsStandards: ['RICS NRM2'],
    buildingRegulationsCompliance: true,
    regulationsAddressed: ['Part A', 'Part B', 'Part L'],
    additionalStandards: ['BS 8000'],
    complianceNotes: 'All work to current standards',
    certificationRequired: ['Building Control approval']
  };

  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);

  const mockQuoteData = {
    sowId: 'sow-123',
    builderId: 'builder-123',
    builderProfile: mockBuilderProfile,
    totalPrice: 25000, // Updated to match breakdown total
    breakdown: mockBreakdown,
    timeline: mockTimeline,
    warranty: mockWarranty,
    certifications: mockCertifications,
    terms: mockTerms,
    methodology: 'NRM2' as const,
    complianceStatement: mockComplianceStatement,
    validUntil: futureDate.toISOString()
  };

  describe('create', () => {
    it('should create a new quote with correct structure', () => {
      const quote = QuoteModel.create(mockQuoteData);

      expect(quote.PK).toBe('SOW#sow-123');
      expect(quote.SK).toMatch(/^QUOTE#[a-f0-9-]{36}$/);
      expect(quote.id).toMatch(/^[a-f0-9-]{36}$/);
      expect(quote.sowId).toBe('sow-123');
      expect(quote.builderId).toBe('builder-123');
      expect(quote.totalPrice).toBe(25000);
      expect(quote.currency).toBe('GBP');
      expect(quote.status).toBe('draft');
      expect(quote.version).toBe(1);
      expect(quote.GSI3PK).toBe('builder-123');
      expect(quote.GSI3SK).toMatch(/^draft#/);
      expect(quote.GSI5PK).toBe('sow-123');
      expect(quote.GSI5SK).toBe('000000025000');
    });

    it('should include all required fields', () => {
      const quote = QuoteModel.create(mockQuoteData);

      expect(quote.builderProfile).toEqual(mockBuilderProfile);
      expect(quote.breakdown).toEqual(mockBreakdown);
      expect(quote.timeline).toEqual(mockTimeline);
      expect(quote.warranty).toEqual(mockWarranty);
      expect(quote.certifications).toEqual(mockCertifications);
      expect(quote.terms).toEqual(mockTerms);
      expect(quote.methodology).toBe('NRM2');
      expect(quote.complianceStatement).toEqual(mockComplianceStatement);
      expect(quote.validUntil).toBe(futureDate.toISOString());
    });
  });

  describe('updateStatus', () => {
    it('should update quote status correctly', async () => {
      const originalQuote = QuoteModel.create(mockQuoteData);
      // Add a small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 1));
      const updatedQuote = QuoteModel.updateStatus(originalQuote, 'submitted');

      expect(updatedQuote.status).toBe('submitted');
      expect(updatedQuote.GSI3SK).toMatch(/^submitted#/);
      expect(updatedQuote.updatedAt).toBeDefined();
      expect(new Date(updatedQuote.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalQuote.updatedAt).getTime()
      );
    });

    it('should preserve other fields when updating status', () => {
      const originalQuote = QuoteModel.create(mockQuoteData);
      const updatedQuote = QuoteModel.updateStatus(originalQuote, 'under-review');

      expect(updatedQuote.id).toBe(originalQuote.id);
      expect(updatedQuote.totalPrice).toBe(originalQuote.totalPrice);
      expect(updatedQuote.version).toBe(originalQuote.version);
      expect(updatedQuote.builderProfile).toEqual(originalQuote.builderProfile);
    });
  });

  describe('createRevision', () => {
    it('should create a new revision with incremented version', () => {
      const originalQuote = QuoteModel.create(mockQuoteData);
      const revision = QuoteModel.createRevision(originalQuote, { totalPrice: 10000 });

      expect(revision.version).toBe(2);
      expect(revision.status).toBe('revised');
      expect(revision.totalPrice).toBe(10000);
      expect(revision.id).not.toBe(originalQuote.id);
      expect(revision.SK).not.toBe(originalQuote.SK);
      expect(revision.GSI5SK).toBe('000000010000');
    });

    it('should preserve original data except for updates', () => {
      const originalQuote = QuoteModel.create(mockQuoteData);
      const revision = QuoteModel.createRevision(originalQuote, { 
        totalPrice: 10000,
        timeline: { ...mockTimeline, totalDuration: 50 }
      });

      expect(revision.sowId).toBe(originalQuote.sowId);
      expect(revision.builderId).toBe(originalQuote.builderId);
      expect(revision.builderProfile).toEqual(originalQuote.builderProfile);
      expect(revision.timeline.totalDuration).toBe(50);
      expect(revision.totalPrice).toBe(10000);
    });
  });

  describe('validateQuote', () => {
    it('should return no errors for valid quote', () => {
      const quote = QuoteModel.create(mockQuoteData);
      const errors = QuoteModel.validateQuote(quote);

      expect(errors).toHaveLength(0);
    });

    it('should validate required fields', () => {
      const invalidQuote = QuoteModel.create({
        ...mockQuoteData,
        sowId: '',
        builderId: '',
        totalPrice: -100
      });

      const errors = QuoteModel.validateQuote(invalidQuote);

      expect(errors).toContainEqual({
        field: 'sowId',
        message: 'SoW ID is required',
        code: 'REQUIRED_FIELD'
      });
      expect(errors).toContainEqual({
        field: 'builderId',
        message: 'Builder ID is required',
        code: 'REQUIRED_FIELD'
      });
      expect(errors).toContainEqual({
        field: 'totalPrice',
        message: 'Total price must be greater than 0',
        code: 'INVALID_VALUE'
      });
    });

    it('should validate breakdown totals match quote total', () => {
      const invalidBreakdown = [
        {
          ...mockBreakdown[0],
          totalCost: 1000
        }
      ];

      const quote = QuoteModel.create({
        ...mockQuoteData,
        breakdown: invalidBreakdown,
        totalPrice: 9000
      });

      const errors = QuoteModel.validateQuote(quote);

      expect(errors).toContainEqual({
        field: 'breakdown',
        message: 'Breakdown total does not match quote total price',
        code: 'CALCULATION_ERROR'
      });
    });

    it('should validate timeline duration', () => {
      const quote = QuoteModel.create({
        ...mockQuoteData,
        timeline: {
          ...mockTimeline,
          totalDuration: 0
        }
      });

      const errors = QuoteModel.validateQuote(quote);

      expect(errors).toContainEqual({
        field: 'timeline.totalDuration',
        message: 'Timeline duration must be greater than 0',
        code: 'INVALID_VALUE'
      });
    });

    it('should validate payment schedule totals 100%', () => {
      const invalidTerms = {
        ...mockTerms,
        paymentSchedule: {
          ...mockTerms.paymentSchedule,
          schedule: [
            { ...mockTerms.paymentSchedule.schedule[0], percentage: 50 },
            { ...mockTerms.paymentSchedule.schedule[1], percentage: 30 }
            // Missing 20% to total 100%
          ]
        }
      };

      const quote = QuoteModel.create({
        ...mockQuoteData,
        terms: invalidTerms
      });

      const errors = QuoteModel.validateQuote(quote);

      expect(errors).toContainEqual({
        field: 'terms.paymentSchedule',
        message: 'Payment schedule percentages must total 100%',
        code: 'PAYMENT_SCHEDULE_ERROR'
      });
    });

    it('should validate NRM2 compliance when methodology is NRM2', () => {
      const incompleteBreakdown = [
        {
          ...mockBreakdown[0],
          category: 'substructure' as NRM2Element
        }
        // Missing required NRM2 elements
      ];

      const quote = QuoteModel.create({
        ...mockQuoteData,
        breakdown: incompleteBreakdown,
        methodology: 'NRM2'
      });

      const errors = QuoteModel.validateQuote(quote);

      expect(errors.some(error => 
        error.field === 'breakdown' && 
        error.message.includes('Missing required NRM2 elements')
      )).toBe(true);
    });
  });

  describe('calculateBreakdownTotals', () => {
    it('should calculate totals correctly', () => {
      const totals = QuoteModel.calculateBreakdownTotals(mockBreakdown);

      expect(totals.totalCost).toBe(25000);
      expect(totals.totalLabour).toBe(16000);
      expect(totals.totalMaterials).toBe(7100);
      expect(totals.totalEquipment).toBe(1900);
      expect(totals.totalOverheads).toBe(2500); // 10% of 25000
      expect(totals.totalProfit).toBe(3750); // 15% of 25000
    });

    it('should handle empty breakdown', () => {
      const totals = QuoteModel.calculateBreakdownTotals([]);

      expect(totals.totalCost).toBe(0);
      expect(totals.totalLabour).toBe(0);
      expect(totals.totalMaterials).toBe(0);
      expect(totals.totalEquipment).toBe(0);
      expect(totals.totalOverheads).toBe(0);
      expect(totals.totalProfit).toBe(0);
    });
  });

  describe('isExpired', () => {
    it('should return false for future valid until date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const quote = QuoteModel.create({
        ...mockQuoteData,
        validUntil: futureDate.toISOString()
      });

      expect(QuoteModel.isExpired(quote)).toBe(false);
    });

    it('should return true for past valid until date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const quote = QuoteModel.create({
        ...mockQuoteData,
        validUntil: pastDate.toISOString()
      });

      expect(QuoteModel.isExpired(quote)).toBe(true);
    });
  });

  describe('canBeModified', () => {
    it('should allow modification for draft status and not expired', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const quote = QuoteModel.create({
        ...mockQuoteData,
        validUntil: futureDate.toISOString()
      });

      expect(QuoteModel.canBeModified(quote)).toBe(true);
    });

    it('should not allow modification for submitted status', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      
      const quote = QuoteModel.updateStatus(
        QuoteModel.create({
          ...mockQuoteData,
          validUntil: futureDate.toISOString()
        }),
        'submitted'
      );

      expect(QuoteModel.canBeModified(quote)).toBe(false);
    });

    it('should not allow modification for expired quotes', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const quote = QuoteModel.create({
        ...mockQuoteData,
        validUntil: pastDate.toISOString()
      });

      expect(QuoteModel.canBeModified(quote)).toBe(false);
    });
  });

  describe('getComplianceScore', () => {
    it('should calculate compliance score correctly', () => {
      const quote = QuoteModel.create(mockQuoteData);
      const score = QuoteModel.getComplianceScore(quote);

      expect(score).toBe(100); // All compliance flags are true
    });

    it('should calculate partial compliance score', () => {
      const partialCompliance = {
        ...mockComplianceStatement,
        ribaCompliance: false,
        nhbcCompliance: false
      };

      const quote = QuoteModel.create({
        ...mockQuoteData,
        complianceStatement: partialCompliance
      });

      const score = QuoteModel.getComplianceScore(quote);

      expect(score).toBe(60); // 3 out of 5 compliance areas
    });
  });

  describe('sanitizeForResponse', () => {
    it('should remove GSI fields from response', () => {
      const quote = QuoteModel.create(mockQuoteData);
      const sanitized = QuoteModel.sanitizeForResponse(quote);

      expect(sanitized).not.toHaveProperty('GSI3PK');
      expect(sanitized).not.toHaveProperty('GSI3SK');
      expect(sanitized).not.toHaveProperty('GSI5PK');
      expect(sanitized).not.toHaveProperty('GSI5SK');
      expect(sanitized.id).toBe(quote.id);
      expect(sanitized.totalPrice).toBe(quote.totalPrice);
    });
  });

  describe('compareQuotes', () => {
    it('should compare quotes correctly', () => {
      const quote1 = QuoteModel.create({ ...mockQuoteData, totalPrice: 8000 });
      const quote2 = QuoteModel.create({ 
        ...mockQuoteData, 
        totalPrice: 10000,
        timeline: { ...mockTimeline, totalDuration: 30 }
      });

      const comparison = QuoteModel.compareQuotes([quote1, quote2]);

      expect(comparison.priceComparison[0].quoteId).toBe(quote1.id);
      expect(comparison.priceComparison[0].rank).toBe(1);
      expect(comparison.priceComparison[1].quoteId).toBe(quote2.id);
      expect(comparison.priceComparison[1].rank).toBe(2);

      expect(comparison.timelineComparison[0].quoteId).toBe(quote2.id);
      expect(comparison.timelineComparison[0].rank).toBe(1);
    });
  });
});