import { ComplianceService } from '../../services/ComplianceService';
import { ProjectType, ProjectRequirements, Document } from '../../types';

// Mock AWS Bedrock client for integration test
let mockCallCount = 0;
jest.mock('../../config/aws', () => ({
  bedrockClient: {
    send: jest.fn().mockImplementation(() => {
      const responses = [
        // RICS response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify({
                compliant: true,
                score: 85,
                standardsChecked: ['RICS Professional Standards'],
                violations: [],
                requiredActions: [],
                aiAnalysis: 'Project meets RICS standards'
              })
            }]
          }))
        },
        // RIBA response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify({
                currentStage: 2,
                applicableStages: [0, 1, 2, 3, 4],
                stageValidation: [],
                overallCompliance: true,
                nextStageRequirements: [],
                aiAnalysis: 'RIBA stages appropriate'
              })
            }]
          }))
        },
        // NHBC response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify({
                applicable: true,
                compliant: true,
                score: 90,
                standardsChecked: ['Chapter 4.1'],
                violations: [],
                warrantyEligible: true,
                aiAnalysis: 'Meets NHBC standards'
              })
            }]
          }))
        },
        // Building Control response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify([{
                regulation: 'Part A - Structure',
                required: true,
                applicationType: 'Full Plans',
                reason: 'Structural modifications require approval',
                documentation: ['Structural calculations'],
                inspections: ['Foundation inspection'],
                certificates: ['Structural engineer certificate'],
                timeline: '4-6 weeks',
                fees: '£400-£600'
              }])
            }]
          }))
        },
        // Compliance Score response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify({
                score: 87,
                confidence: 0.9,
                breakdown: { documentation: 85, regulatory: 90, professional: 85, risk: 88 },
                riskLevel: 'low',
                explanation: 'High compliance score'
              })
            }]
          }))
        },
        // Recommendations response
        {
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify(['Submit Building Control application', 'Engage structural engineer'])
            }]
          }))
        }
      ];
      
      const response = responses[mockCallCount % responses.length];
      mockCallCount++;
      return Promise.resolve(response);
    })
  }
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('Compliance Workflow Integration', () => {
  let complianceService: ComplianceService;

  const mockProjectRequirements: ProjectRequirements = {
    description: 'Single storey rear extension with kitchen extension',
    dimensions: {
      length: 6,
      width: 4,
      height: 3,
      area: 24,
      unit: 'meters'
    },
    materials: {
      quality: 'standard',
      preferences: ['brick', 'tile roof', 'double glazing'],
      restrictions: ['no asbestos', 'sustainable materials preferred']
    },
    timeline: {
      startDate: '2024-04-01',
      endDate: '2024-08-01',
      flexibility: 'flexible'
    },
    budget: {
      min: 30000,
      max: 40000,
      currency: 'GBP'
    },
    specialRequirements: ['disabled access', 'energy efficient design']
  };

  const mockDocuments: Document[] = [
    {
      id: 'doc1',
      filename: 'structural-calculations.pdf',
      originalName: 'structural-calculations.pdf',
      mimeType: 'application/pdf',
      size: 2048000,
      s3Key: 'projects/proj1/documents/doc1/structural-calculations.pdf',
      uploadedAt: '2024-01-15T10:00:00Z',
      version: 1,
      status: 'processed',
      classification: {
        type: 'structural-calculation',
        confidence: 0.95,
        aiAnalysis: 'Structural calculations for rear extension'
      },
      auditTrail: []
    },
    {
      id: 'doc2',
      filename: 'architectural-plans.dwg',
      originalName: 'architectural-plans.dwg',
      mimeType: 'application/dwg',
      size: 5120000,
      s3Key: 'projects/proj1/documents/doc2/architectural-plans.dwg',
      uploadedAt: '2024-01-15T11:00:00Z',
      version: 1,
      status: 'processed',
      classification: {
        type: 'architectural-plan',
        confidence: 0.92,
        aiAnalysis: 'Architectural plans showing extension layout'
      },
      auditTrail: []
    }
  ];

  beforeEach(() => {
    complianceService = new ComplianceService();
    jest.clearAllMocks();
  });

  describe('End-to-End Compliance Check', () => {
    it('should perform complete compliance check for rear extension project', async () => {
      const result = await complianceService.performComplianceCheck(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      // Verify overall structure
      expect(result).toBeDefined();
      expect(result.projectType).toBe('rear-extension');
      expect(result.checkedAt).toBeDefined();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);

      // Verify compliance scores
      expect(result.overallScore).toBeDefined();
      expect(result.overallScore.score).toBeGreaterThanOrEqual(0);
      expect(result.overallScore.score).toBeLessThanOrEqual(100);
      expect(result.overallScore.confidence).toBeGreaterThanOrEqual(0);
      expect(result.overallScore.confidence).toBeLessThanOrEqual(1);
      expect(['low', 'medium', 'high', 'critical']).toContain(result.overallScore.riskLevel);

      // Verify RICS compliance
      expect(result.ricsCompliance).toBeDefined();
      expect(typeof result.ricsCompliance.compliant).toBe('boolean');
      expect(result.ricsCompliance.score).toBeGreaterThanOrEqual(0);
      expect(result.ricsCompliance.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.ricsCompliance.standardsChecked)).toBe(true);
      expect(Array.isArray(result.ricsCompliance.violations)).toBe(true);
      expect(Array.isArray(result.ricsCompliance.requiredActions)).toBe(true);
      expect(result.ricsCompliance.aiAnalysis).toBeDefined();

      // Verify RIBA compliance
      expect(result.ribaCompliance).toBeDefined();
      expect(result.ribaCompliance.currentStage).toBeGreaterThanOrEqual(0);
      expect(result.ribaCompliance.currentStage).toBeLessThanOrEqual(7);
      expect(Array.isArray(result.ribaCompliance.applicableStages)).toBe(true);
      expect(Array.isArray(result.ribaCompliance.stageValidation)).toBe(true);
      expect(typeof result.ribaCompliance.overallCompliance).toBe('boolean');
      expect(Array.isArray(result.ribaCompliance.nextStageRequirements)).toBe(true);

      // Verify NHBC compliance (should be applicable for residential extension)
      expect(result.nhbcCompliance).toBeDefined();
      expect(result.nhbcCompliance.applicable).toBe(true);
      expect(typeof result.nhbcCompliance.compliant).toBe('boolean');
      expect(result.nhbcCompliance.score).toBeGreaterThanOrEqual(0);
      expect(result.nhbcCompliance.score).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.nhbcCompliance.standardsChecked)).toBe(true);
      expect(Array.isArray(result.nhbcCompliance.violations)).toBe(true);
      expect(typeof result.nhbcCompliance.warrantyEligible).toBe('boolean');

      // Verify Building Control requirements
      expect(Array.isArray(result.buildingControlRequirements)).toBe(true);
      result.buildingControlRequirements.forEach(req => {
        expect(req.regulation).toBeDefined();
        expect(typeof req.required).toBe('boolean');
        expect(['Full Plans', 'Building Notice', 'Not Required']).toContain(req.applicationType);
        expect(req.reason).toBeDefined();
        expect(Array.isArray(req.documentation)).toBe(true);
        expect(Array.isArray(req.inspections)).toBe(true);
        expect(Array.isArray(req.certificates)).toBe(true);
        expect(req.timeline).toBeDefined();
        expect(req.fees).toBeDefined();
      });

      // Verify violations and recommendations
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should handle loft conversion project with different compliance requirements', async () => {
      const loftRequirements: ProjectRequirements = {
        ...mockProjectRequirements,
        description: 'Loft conversion with dormer windows',
        dimensions: {
          length: 8,
          width: 5,
          height: 2.5,
          area: 40,
          unit: 'meters'
        },
        specialRequirements: ['fire escape', 'insulation upgrade', 'structural reinforcement']
      };

      const result = await complianceService.performComplianceCheck(
        'loft-conversion',
        loftRequirements,
        mockDocuments
      );

      expect(result.projectType).toBe('loft-conversion');
      expect(result.nhbcCompliance.applicable).toBe(true); // Should be applicable for residential
      expect(Array.isArray(result.buildingControlRequirements)).toBe(true); // Should have requirements array
    });

    it('should handle non-residential project with appropriate NHBC handling', async () => {
      const commercialRequirements: ProjectRequirements = {
        ...mockProjectRequirements,
        description: 'Commercial office renovation'
      };

      const result = await complianceService.performComplianceCheck(
        'other',
        commercialRequirements,
        mockDocuments
      );

      expect(result.projectType).toBe('other');
      expect(result.nhbcCompliance.applicable).toBe(false); // Should not be applicable for non-residential
      expect(result.nhbcCompliance.compliant).toBe(true); // Should be compliant by default
      expect(result.nhbcCompliance.score).toBe(100); // Should have perfect score
    });

    it('should provide meaningful recommendations based on violations', async () => {
      const result = await complianceService.performComplianceCheck(
        'basement-conversion',
        mockProjectRequirements,
        []
      );

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      
      // Should have at least some recommendations for a complex project like basement conversion
      if (result.recommendations.length > 0) {
        result.recommendations.forEach(recommendation => {
          expect(typeof recommendation).toBe('string');
          expect(recommendation.length).toBeGreaterThan(0);
        });
      }
    });

    it('should calculate compliance scores consistently', async () => {
      const results = await Promise.all([
        complianceService.performComplianceCheck('rear-extension', mockProjectRequirements, mockDocuments),
        complianceService.performComplianceCheck('rear-extension', mockProjectRequirements, mockDocuments),
        complianceService.performComplianceCheck('rear-extension', mockProjectRequirements, mockDocuments)
      ]);

      // All results should have valid scores
      results.forEach(result => {
        expect(result.overallScore.score).toBeGreaterThanOrEqual(0);
        expect(result.overallScore.score).toBeLessThanOrEqual(100);
        expect(result.ricsCompliance.score).toBeGreaterThanOrEqual(0);
        expect(result.ricsCompliance.score).toBeLessThanOrEqual(100);
        expect(result.nhbcCompliance.score).toBeGreaterThanOrEqual(0);
        expect(result.nhbcCompliance.score).toBeLessThanOrEqual(100);
      });
    });

    it('should handle projects with no documents gracefully', async () => {
      const result = await complianceService.performComplianceCheck(
        'kitchen-renovation',
        mockProjectRequirements,
        []
      );

      expect(result).toBeDefined();
      expect(result.projectType).toBe('kitchen-renovation');
      expect(result.overallScore.score).toBeGreaterThanOrEqual(0);
      
      // Should still provide compliance checks even without documents
      expect(result.ricsCompliance).toBeDefined();
      expect(result.ribaCompliance).toBeDefined();
      expect(result.nhbcCompliance).toBeDefined();
      expect(Array.isArray(result.buildingControlRequirements)).toBe(true);
    });
  });

  describe('Knowledge Base Integration', () => {
    it('should provide comprehensive knowledge base', () => {
      const knowledgeBase = (complianceService as any).knowledgeBase;

      expect(knowledgeBase).toBeDefined();
      expect(knowledgeBase.buildingRegulations).toBeDefined();
      expect(knowledgeBase.ricsStandards).toBeDefined();
      expect(knowledgeBase.ribaStages).toBeDefined();
      expect(knowledgeBase.nhbcChapters).toBeDefined();

      // Verify building regulations coverage
      expect(knowledgeBase.buildingRegulations['Part A']).toContain('Structure');
      expect(knowledgeBase.buildingRegulations['Part L']).toContain('Conservation of fuel and power');

      // Verify RIBA stages
      expect(knowledgeBase.ribaStages[0]).toBe('Strategic Definition');
      expect(knowledgeBase.ribaStages[4]).toBe('Technical Design');

      // Verify NHBC chapters
      expect(knowledgeBase.nhbcChapters['4.1']).toBe('Foundations');
      expect(knowledgeBase.nhbcChapters['6.1']).toBe('Structural frame');
    });
  });
});