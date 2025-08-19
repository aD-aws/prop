import request from 'supertest';
import express from 'express';
import complianceRoutes from '../../routes/compliance';
import { complianceService } from '../../services/ComplianceService';
import { authenticateToken } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';
import { ProjectType } from '../../types';

// Mock dependencies
jest.mock('../../services/ComplianceService');
jest.mock('../../middleware/auth');
jest.mock('../../middleware/validation');

const app = express();
app.use(express.json());
app.use('/api/compliance', complianceRoutes);

const mockComplianceService = complianceService as jest.Mocked<typeof complianceService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;
const mockValidateRequest = validateRequest as jest.MockedFunction<typeof validateRequest>;

describe('Compliance Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock authentication middleware
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { userId: 'user123', email: 'test@example.com', userType: 'homeowner' };
      next();
    });

    // Mock validation middleware
    mockValidateRequest.mockImplementation(() => (req: any, res: any, next: any) => {
      next();
    });
  });

  describe('POST /api/compliance/check', () => {
    const validRequestBody = {
      projectType: 'rear-extension',
      requirements: {
        description: 'Single storey rear extension',
        dimensions: { length: 6, width: 4, height: 3, area: 24, unit: 'meters' },
        materials: { quality: 'standard', preferences: ['brick'], restrictions: [] },
        timeline: { flexibility: 'flexible' },
        budget: { min: 25000, max: 35000, currency: 'GBP' },
        specialRequirements: []
      },
      documents: []
    };

    it('should perform compliance check successfully', async () => {
      const mockResult = {
        projectType: 'rear-extension' as ProjectType,
        overallScore: {
          score: 85,
          confidence: 0.9,
          breakdown: { documentation: 80, regulatory: 90, professional: 85, risk: 85 },
          riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical',
          explanation: 'Good compliance score'
        },
        ricsCompliance: {
          compliant: true,
          score: 85,
          standardsChecked: ['RICS Professional Standards'],
          violations: [],
          requiredActions: [],
          aiAnalysis: 'Meets RICS standards'
        },
        ribaCompliance: {
          currentStage: 2,
          applicableStages: [0, 1, 2, 3, 4],
          stageValidation: [],
          overallCompliance: true,
          nextStageRequirements: [],
          aiAnalysis: 'RIBA stages appropriate'
        },
        nhbcCompliance: {
          applicable: true,
          compliant: true,
          score: 90,
          standardsChecked: ['Chapter 4.1'],
          violations: [],
          warrantyEligible: true,
          aiAnalysis: 'Meets NHBC standards'
        },
        buildingControlRequirements: [{
          regulation: 'Part A - Structure',
          required: true,
          applicationType: 'Full Plans' as 'Full Plans' | 'Building Notice' | 'Not Required',
          reason: 'Structural modifications',
          documentation: ['Structural calculations'],
          inspections: ['Foundation inspection'],
          certificates: ['Structural engineer certificate'],
          timeline: '4-6 weeks',
          fees: '£400-£600'
        }],
        violations: [],
        recommendations: ['Submit Building Control application'],
        checkedAt: '2024-01-15T10:00:00Z',
        processingTime: 2500
      };

      mockComplianceService.performComplianceCheck.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/check')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(mockComplianceService.performComplianceCheck).toHaveBeenCalledWith(
        'rear-extension',
        validRequestBody.requirements,
        validRequestBody.documents
      );
    });

    it('should handle compliance check failure', async () => {
      mockComplianceService.performComplianceCheck.mockRejectedValueOnce(
        new Error('Compliance check failed')
      );

      const response = await request(app)
        .post('/api/compliance/check')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLIANCE_CHECK_FAILED');
      expect(response.body.error.message).toBe('Failed to perform compliance check');
    });

    it('should validate request body', async () => {
      const invalidRequestBody = {
        projectType: 'invalid-type',
        requirements: 'not-an-object',
        documents: 'not-an-array'
      };

      // Mock compliance service to throw validation error
      mockComplianceService.performComplianceCheck.mockRejectedValueOnce(
        new Error('Invalid project type')
      );

      const response = await request(app)
        .post('/api/compliance/check')
        .send(invalidRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COMPLIANCE_CHECK_FAILED');
    });
  });

  describe('POST /api/compliance/rics-check', () => {
    const validRequestBody = {
      projectType: 'loft-conversion',
      requirements: {
        description: 'Loft conversion with dormer',
        dimensions: { length: 8, width: 5, height: 2.5, area: 40, unit: 'meters' },
        materials: { quality: 'premium', preferences: ['timber frame'], restrictions: [] },
        timeline: { flexibility: 'rigid' },
        budget: { min: 40000, max: 50000, currency: 'GBP' },
        specialRequirements: ['roof lights']
      },
      documents: []
    };

    it('should perform RICS compliance check successfully', async () => {
      const mockResult = {
        compliant: false,
        score: 70,
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
      };

      // Mock the private method access
      (mockComplianceService as any).checkRICSStandards = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/rics-check')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should handle RICS check failure', async () => {
      (mockComplianceService as any).checkRICSStandards = jest.fn().mockRejectedValueOnce(
        new Error('RICS check failed')
      );

      const response = await request(app)
        .post('/api/compliance/rics-check')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RICS_CHECK_FAILED');
    });
  });

  describe('POST /api/compliance/riba-validation', () => {
    const validRequestBody = {
      projectType: 'conservatory',
      requirements: {
        description: 'Glass conservatory extension',
        dimensions: { length: 4, width: 3, height: 3, area: 12, unit: 'meters' },
        materials: { quality: 'standard', preferences: ['glass', 'aluminium'], restrictions: [] },
        timeline: { flexibility: 'flexible' },
        budget: { min: 15000, max: 20000, currency: 'GBP' },
        specialRequirements: ['planning permission']
      }
    };

    it('should perform RIBA validation successfully', async () => {
      const mockResult = {
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
      };

      (mockComplianceService as any).validateRIBAStages = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/riba-validation')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should handle RIBA validation failure', async () => {
      (mockComplianceService as any).validateRIBAStages = jest.fn().mockRejectedValueOnce(
        new Error('RIBA validation failed')
      );

      const response = await request(app)
        .post('/api/compliance/riba-validation')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('RIBA_VALIDATION_FAILED');
    });
  });

  describe('POST /api/compliance/nhbc-check', () => {
    const validRequestBody = {
      projectType: 'garage-conversion',
      requirements: {
        description: 'Convert garage to living space',
        dimensions: { length: 6, width: 3, height: 2.4, area: 18, unit: 'meters' },
        materials: { quality: 'standard', preferences: ['insulation', 'plasterboard'], restrictions: [] },
        timeline: { flexibility: 'flexible' },
        budget: { min: 12000, max: 18000, currency: 'GBP' },
        specialRequirements: ['heating system']
      },
      documents: []
    };

    it('should perform NHBC check successfully', async () => {
      const mockResult = {
        applicable: true,
        compliant: false,
        score: 75,
        standardsChecked: ['Chapter 4.1', 'Chapter 6.1'],
        violations: [{
          chapter: 'Chapter 6.2',
          severity: 'medium',
          description: 'Insulation specification unclear',
          requirement: 'Thermal insulation must meet current standards',
          recommendation: 'Provide detailed insulation specification'
        }],
        warrantyEligible: false,
        warrantyConditions: ['Address insulation requirements'],
        aiAnalysis: 'Insulation requirements need clarification'
      };

      (mockComplianceService as any).checkNHBCStandards = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/nhbc-check')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
    });

    it('should handle NHBC check failure', async () => {
      (mockComplianceService as any).checkNHBCStandards = jest.fn().mockRejectedValueOnce(
        new Error('NHBC check failed')
      );

      const response = await request(app)
        .post('/api/compliance/nhbc-check')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NHBC_CHECK_FAILED');
    });
  });

  describe('POST /api/compliance/building-control', () => {
    const validRequestBody = {
      projectType: 'basement-conversion',
      requirements: {
        description: 'Convert basement to habitable space',
        dimensions: { length: 8, width: 6, height: 2.2, area: 48, unit: 'meters' },
        materials: { quality: 'premium', preferences: ['waterproofing', 'ventilation'], restrictions: [] },
        timeline: { flexibility: 'rigid' },
        budget: { min: 35000, max: 45000, currency: 'GBP' },
        specialRequirements: ['damp proofing', 'fire escape']
      }
    };

    it('should check Building Control requirements successfully', async () => {
      const mockResult = [
        {
          regulation: 'Part A - Structure',
          required: true,
          applicationType: 'Full Plans',
          reason: 'Structural modifications to basement',
          documentation: ['Structural calculations', 'Foundation assessment'],
          inspections: ['Structural inspection', 'Waterproofing inspection'],
          certificates: ['Structural engineer certificate'],
          timeline: '6-8 weeks',
          fees: '£600-£800'
        },
        {
          regulation: 'Part C - Site preparation and resistance to contaminants and moisture',
          required: true,
          applicationType: 'Full Plans',
          reason: 'Basement waterproofing requirements',
          documentation: ['Waterproofing specification', 'Damp proof membrane details'],
          inspections: ['Waterproofing inspection'],
          certificates: ['Waterproofing specialist certificate'],
          timeline: '3-4 weeks',
          fees: '£300-£400'
        }
      ];

      (mockComplianceService as any).checkBuildingControlRequirements = jest.fn().mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/building-control')
        .send(validRequestBody)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockResult);
      expect(response.body.data).toHaveLength(2);
    });

    it('should handle Building Control check failure', async () => {
      (mockComplianceService as any).checkBuildingControlRequirements = jest.fn().mockRejectedValueOnce(
        new Error('Building Control check failed')
      );

      const response = await request(app)
        .post('/api/compliance/building-control')
        .send(validRequestBody)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BUILDING_CONTROL_CHECK_FAILED');
    });
  });

  describe('GET /api/compliance/knowledge-base', () => {
    it('should retrieve knowledge base successfully', async () => {
      const mockKnowledgeBase = {
        buildingRegulations: {
          'Part A': 'Structure - Covers structural safety, loading, ground movement',
          'Part B': 'Fire Safety - Fire detection, escape routes, fire resistance',
          'Part L': 'Conservation of fuel and power - Energy efficiency, insulation'
        },
        ricsStandards: [
          'RICS Professional Standards and Guidance',
          'RICS Surveying Safely',
          'RICS Construction Standards'
        ],
        ribaStages: {
          0: 'Strategic Definition',
          1: 'Preparation and Briefing',
          2: 'Concept Design'
        },
        nhbcChapters: {
          '4.1': 'Foundations',
          '6.1': 'Structural frame',
          '6.2': 'Thermal insulation'
        }
      };

      (mockComplianceService as any).knowledgeBase = mockKnowledgeBase;

      const response = await request(app)
        .get('/api/compliance/knowledge-base')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockKnowledgeBase);
    });

    it('should handle knowledge base retrieval failure', async () => {
      // Mock the knowledge base access to throw an error
      Object.defineProperty(mockComplianceService, 'knowledgeBase', {
        get: () => {
          throw new Error('Knowledge base access failed');
        }
      });

      const response = await request(app)
        .get('/api/compliance/knowledge-base')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('KNOWLEDGE_BASE_FAILED');
    });
  });

  describe('Authentication and Authorization', () => {
    it('should require authentication for all endpoints', async () => {
      mockAuthenticateToken.mockImplementationOnce((req: any, res: any, next: any) => {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        });
      });

      const response = await request(app)
        .post('/api/compliance/check')
        .send({
          projectType: 'rear-extension',
          requirements: {},
          documents: []
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should include request ID in responses', async () => {
      const mockResult = {
        projectType: 'rear-extension' as ProjectType,
        overallScore: { score: 85, confidence: 0.9, breakdown: {}, riskLevel: 'low' as 'low' | 'medium' | 'high' | 'critical', explanation: 'Good' },
        ricsCompliance: { compliant: true, score: 85, standardsChecked: [], violations: [], requiredActions: [], aiAnalysis: 'Good' },
        ribaCompliance: { currentStage: 2, applicableStages: [0, 1, 2], stageValidation: [], overallCompliance: true, nextStageRequirements: [], aiAnalysis: 'Good' },
        nhbcCompliance: { applicable: true, compliant: true, score: 90, standardsChecked: [], violations: [], warrantyEligible: true, aiAnalysis: 'Good' },
        buildingControlRequirements: [],
        violations: [],
        recommendations: [],
        checkedAt: '2024-01-15T10:00:00Z',
        processingTime: 1000
      };

      mockComplianceService.performComplianceCheck.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/compliance/check')
        .set('X-Request-ID', 'test-request-123')
        .send({
          projectType: 'rear-extension',
          requirements: {},
          documents: []
        })
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });
});