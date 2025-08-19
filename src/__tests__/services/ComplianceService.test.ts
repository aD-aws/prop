import { ComplianceService } from '../../services/ComplianceService';
import { bedrockClient } from '../../config/aws';
import { 
  ProjectType, 
  ProjectRequirements, 
  Document,
  ComplianceCheckResult,
  RICSStandardsCheck,
  RIBAStageValidation,
  NHBCStandardsCheck,
  BuildingControlRequirement
} from '../../types';

// Mock AWS Bedrock client
jest.mock('../../config/aws', () => ({
  bedrockClient: {
    send: jest.fn()
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

describe('ComplianceService', () => {
  let complianceService: ComplianceService;
  const mockBedrockClient = bedrockClient as any;

  const mockProjectRequirements: ProjectRequirements = {
    description: 'Single storey rear extension',
    dimensions: {
      length: 6,
      width: 4,
      height: 3,
      area: 24,
      unit: 'meters'
    },
    materials: {
      quality: 'standard',
      preferences: ['brick', 'tile roof'],
      restrictions: ['no asbestos']
    },
    timeline: {
      startDate: '2024-03-01',
      endDate: '2024-06-01',
      flexibility: 'flexible'
    },
    budget: {
      min: 25000,
      max: 35000,
      currency: 'GBP'
    },
    specialRequirements: ['disabled access']
  };

  const mockDocuments: Document[] = [
    {
      id: 'doc1',
      filename: 'structural-plan.pdf',
      originalName: 'structural-plan.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'projects/proj1/documents/doc1/structural-plan.pdf',
      uploadedAt: '2024-01-15T10:00:00Z',
      version: 1,
      status: 'processed',
      classification: {
        type: 'structural-drawing',
        confidence: 0.95,
        aiAnalysis: 'Structural drawing with beam calculations'
      },
      auditTrail: []
    }
  ];

  beforeEach(() => {
    complianceService = new ComplianceService();
    jest.clearAllMocks();
  });

  describe('performComplianceCheck', () => {
    it('should perform comprehensive compliance check successfully', async () => {
      // Mock successful Bedrock responses
      const mockRICSResponse = {
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
      };

      const mockRIBAResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              currentStage: 2,
              applicableStages: [0, 1, 2, 3, 4],
              stageValidation: [],
              overallCompliance: true,
              nextStageRequirements: [],
              aiAnalysis: 'RIBA stages properly structured'
            })
          }]
        }))
      };

      const mockNHBCResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              applicable: true,
              compliant: true,
              score: 90,
              standardsChecked: ['Chapter 4.1', 'Chapter 6.1'],
              violations: [],
              warrantyEligible: true,
              aiAnalysis: 'Meets NHBC standards'
            })
          }]
        }))
      };

      const mockBuildingControlResponse = {
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
      };

      const mockScoreResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              score: 87,
              confidence: 0.9,
              breakdown: {
                documentation: 85,
                regulatory: 90,
                professional: 85,
                risk: 88
              },
              riskLevel: 'low',
              explanation: 'High compliance score with low risk'
            })
          }]
        }))
      };

      mockBedrockClient.send
        .mockResolvedValueOnce(mockRICSResponse)
        .mockResolvedValueOnce(mockRIBAResponse)
        .mockResolvedValueOnce(mockNHBCResponse)
        .mockResolvedValueOnce(mockBuildingControlResponse)
        .mockResolvedValueOnce(mockScoreResponse)
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: JSON.stringify(['Ensure structural engineer certification', 'Submit Building Control application'])
            }]
          }))
        });

      const result = await complianceService.performComplianceCheck(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result).toBeDefined();
      expect(result.projectType).toBe('rear-extension');
      expect(result.overallScore.score).toBe(87);
      expect(result.ricsCompliance.compliant).toBe(true);
      expect(result.ribaCompliance.overallCompliance).toBe(true);
      expect(result.nhbcCompliance.compliant).toBe(true);
      expect(result.buildingControlRequirements).toHaveLength(1);
      expect(result.recommendations).toHaveLength(2);
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle Bedrock API failures gracefully', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Bedrock API error'));

      const result = await complianceService.performComplianceCheck(
        'loft-conversion',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result).toBeDefined();
      expect(result.ricsCompliance.compliant).toBe(false);
      expect(result.ricsCompliance.score).toBe(50);
      expect(result.ricsCompliance.aiAnalysis).toContain('professional review recommended');
    });

    it('should handle non-residential projects for NHBC', async () => {
      const mockCommercialResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              compliant: true,
              score: 80,
              standardsChecked: ['RICS Professional Standards'],
              violations: [],
              requiredActions: [],
              aiAnalysis: 'Commercial project compliance check'
            })
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValue(mockCommercialResponse);

      const result = await complianceService.performComplianceCheck(
        'other', // Non-residential project type
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.nhbcCompliance.applicable).toBe(false);
      expect(result.nhbcCompliance.compliant).toBe(true);
      expect(result.nhbcCompliance.score).toBe(100);
    });
  });

  describe('RICS Standards Check', () => {
    it('should validate RICS professional standards', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              compliant: false,
              score: 65,
              standardsChecked: ['RICS Professional Standards', 'RICS Surveying Safely'],
              violations: [{
                standard: 'RICS Professional Standards',
                severity: 'medium',
                description: 'Missing structural survey',
                requirement: 'Professional structural survey required',
                recommendation: 'Engage RICS qualified structural surveyor'
              }],
              requiredActions: ['Obtain structural survey'],
              aiAnalysis: 'Project requires additional RICS compliance measures'
            })
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).checkRICSStandards(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.compliant).toBe(false);
      expect(result.score).toBe(65);
      expect(result.violations).toHaveLength(1);
      expect(result.violations[0].severity).toBe('medium');
      expect(result.requiredActions).toContain('Obtain structural survey');
    });

    it('should return failsafe response on AI failure', async () => {
      mockBedrockClient.send.mockRejectedValueOnce(new Error('AI service unavailable'));

      const result = await (complianceService as any).checkRICSStandards(
        'loft-conversion',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.compliant).toBe(false);
      expect(result.score).toBe(50);
      expect(result.violations).toHaveLength(1);
      expect(result.aiAnalysis).toContain('professional review recommended');
    });
  });

  describe('RIBA Stage Validation', () => {
    it('should validate RIBA Plan of Work stages', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              currentStage: 1,
              applicableStages: [0, 1, 2, 3, 4],
              stageValidation: [{
                stage: 1,
                stageName: 'Preparation and Briefing',
                required: true,
                compliant: true,
                deliverables: ['Project brief', 'Site survey'],
                missingItems: [],
                recommendations: []
              }],
              overallCompliance: true,
              nextStageRequirements: ['Concept design development'],
              aiAnalysis: 'Project is at appropriate RIBA stage'
            })
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).validateRIBAStages(
        'rear-extension',
        mockProjectRequirements
      );

      expect(result.currentStage).toBe(1);
      expect(result.applicableStages).toContain(1);
      expect(result.stageValidation).toHaveLength(1);
      expect(result.overallCompliance).toBe(true);
    });
  });

  describe('NHBC Standards Check', () => {
    it('should check NHBC standards for residential projects', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              applicable: true,
              compliant: false,
              score: 70,
              standardsChecked: ['Chapter 4.1', 'Chapter 6.1'],
              violations: [{
                chapter: 'Chapter 4.1',
                severity: 'high',
                description: 'Foundation depth insufficient',
                requirement: 'Minimum 1m foundation depth required',
                recommendation: 'Increase foundation depth to meet NHBC standards'
              }],
              warrantyEligible: false,
              warrantyConditions: ['Address foundation depth issue'],
              aiAnalysis: 'Foundation design requires modification'
            })
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).checkNHBCStandards(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.applicable).toBe(true);
      expect(result.compliant).toBe(false);
      expect(result.score).toBe(70);
      expect(result.violations).toHaveLength(1);
      expect(result.warrantyEligible).toBe(false);
    });

    it('should mark non-residential projects as not applicable', async () => {
      const result = await (complianceService as any).checkNHBCStandards(
        'other',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.applicable).toBe(false);
      expect(result.compliant).toBe(true);
      expect(result.score).toBe(100);
      expect(result.warrantyEligible).toBe(false);
    });
  });

  describe('Building Control Requirements', () => {
    it('should identify Building Control requirements', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify([
              {
                regulation: 'Part A - Structure',
                required: true,
                applicationType: 'Full Plans',
                reason: 'Structural modifications require Building Control approval',
                documentation: ['Structural calculations', 'Technical drawings'],
                inspections: ['Foundation inspection', 'Structural inspection'],
                certificates: ['Structural engineer certificate'],
                timeline: '4-6 weeks',
                fees: '£400-£600'
              },
              {
                regulation: 'Part L - Conservation of fuel and power',
                required: true,
                applicationType: 'Full Plans',
                reason: 'Extension affects thermal performance',
                documentation: ['Energy calculations', 'Insulation specifications'],
                inspections: ['Insulation inspection'],
                certificates: ['Energy performance certificate'],
                timeline: '2-3 weeks',
                fees: '£200-£300'
              }
            ])
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).checkBuildingControlRequirements(
        'rear-extension',
        mockProjectRequirements
      );

      expect(result).toHaveLength(2);
      expect(result[0].regulation).toBe('Part A - Structure');
      expect(result[0].required).toBe(true);
      expect(result[0].applicationType).toBe('Full Plans');
      expect(result[1].regulation).toBe('Part L - Conservation of fuel and power');
    });

    it('should return failsafe requirements on AI failure', async () => {
      mockBedrockClient.send.mockRejectedValueOnce(new Error('AI service error'));

      const result = await (complianceService as any).checkBuildingControlRequirements(
        'loft-conversion',
        mockProjectRequirements
      );

      expect(result).toHaveLength(1);
      expect(result[0].regulation).toBe('Part A - Structure');
      expect(result[0].required).toBe(true);
    });
  });

  describe('Compliance Score Calculation', () => {
    it('should calculate overall compliance score', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              score: 82,
              confidence: 0.85,
              breakdown: {
                documentation: 80,
                regulatory: 85,
                professional: 80,
                risk: 83
              },
              riskLevel: 'low',
              explanation: 'Good compliance score with comprehensive documentation'
            })
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).calculateComplianceScore(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.score).toBe(82);
      expect(result.confidence).toBe(0.85);
      expect(result.riskLevel).toBe('low');
      expect(result.breakdown.documentation).toBe(80);
    });
  });

  describe('Knowledge Base', () => {
    it('should initialize compliance knowledge base', () => {
      const knowledgeBase = (complianceService as any).knowledgeBase;

      expect(knowledgeBase).toBeDefined();
      expect(knowledgeBase.buildingRegulations).toBeDefined();
      expect(knowledgeBase.ricsStandards).toBeDefined();
      expect(knowledgeBase.ribaStages).toBeDefined();
      expect(knowledgeBase.nhbcChapters).toBeDefined();

      expect(knowledgeBase.buildingRegulations['Part A']).toContain('Structure');
      expect(knowledgeBase.ribaStages[0]).toBe('Strategic Definition');
      expect(knowledgeBase.nhbcChapters['4.1']).toBe('Foundations');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed AI responses', async () => {
      const mockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: 'Invalid JSON response from AI'
          }]
        }))
      };

      mockBedrockClient.send.mockResolvedValueOnce(mockResponse);

      const result = await (complianceService as any).checkRICSStandards(
        'rear-extension',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result.compliant).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.aiAnalysis).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      mockBedrockClient.send.mockRejectedValue(new Error('Network timeout'));

      const result = await complianceService.performComplianceCheck(
        'loft-conversion',
        mockProjectRequirements,
        mockDocuments
      );

      expect(result).toBeDefined();
      expect(result.overallScore.score).toBe(50);
      expect(result.overallScore.explanation).toContain('Unable to calculate detailed compliance score');
      expect(result.recommendations).toContain('Consult with qualified professionals for detailed compliance review');
    });
  });
});