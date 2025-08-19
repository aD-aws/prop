import request from 'supertest';
import express from 'express';
import sowRoutes from '../../routes/sow';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { authenticateToken } from '../../middleware/auth';
import { 
  SoWGenerationResult,
  ScopeOfWork,
  SoWGenerationRequest,
  ProjectType
} from '../../types';

// Mock the service
jest.mock('../../services/SoWGenerationService');
jest.mock('../../middleware/auth');

const mockSoWGenerationService = SoWGenerationService as jest.MockedClass<typeof SoWGenerationService>;
const mockAuthMiddleware = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('SoW Routes', () => {
  let app: express.Application;
  let mockServiceInstance: jest.Mocked<SoWGenerationService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware to add user to request
    mockAuthMiddleware.mockImplementation((req: any, res, next) => {
      req.user = {
        userId: 'test-user-id',
        email: 'test@example.com',
        userType: 'homeowner'
      };
      next();
    });

    // Setup service mock
    mockServiceInstance = {
      generateScopeOfWork: jest.fn(),
      getScopeOfWork: jest.fn(),
      getScopeOfWorksByProject: jest.fn(),
      approveScopeOfWork: jest.fn()
    } as any;

    mockSoWGenerationService.mockImplementation(() => mockServiceInstance);

    app.use('/api/sow', sowRoutes);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sow/generate', () => {
    const validRequest = {
      projectId: '123e4567-e89b-12d3-a456-426614174000',
      projectType: 'loft-conversion',
      requirements: {
        description: 'Convert loft to bedroom',
        dimensions: {
          length: 8,
          width: 4,
          height: 2.5,
          unit: 'meters'
        },
        materials: {
          quality: 'standard',
          preferences: [],
          restrictions: []
        },
        timeline: {
          flexibility: 'flexible'
        },
        budget: {
          min: 25000,
          max: 40000,
          currency: 'GBP'
        },
        specialRequirements: []
      },
      councilData: {
        conservationArea: false,
        listedBuilding: false,
        planningRestrictions: [],
        localAuthority: 'Test Council',
        contactDetails: {
          name: 'Test Planning'
        },
        lastChecked: new Date().toISOString()
      },
      preferences: {
        methodology: 'standard',
        ribaStages: [0, 1, 2, 3, 4, 5],
        detailLevel: 'detailed',
        sustainabilityFocus: 'standard',
        qualityLevel: 'standard',
        timelinePreference: 'balanced',
        customRequirements: [],
        excludeItems: []
      },
      documents: []
    };

    it('should successfully generate a SoW', async () => {
      const mockResult: SoWGenerationResult = {
        success: true,
        sowId: 'generated-sow-id',
        sow: {
          PK: 'SOW#generated-sow-id',
          SK: 'METADATA',
          id: 'generated-sow-id',
          projectId: validRequest.projectId,
          version: 1,
          status: 'generated',
          ribaStages: [],
          specifications: [],
          materials: {
            categories: [],
            totalEstimatedCost: 25000,
            currency: 'GBP',
            lastUpdated: new Date().toISOString(),
            supplierRecommendations: [],
            sustainabilityScore: 0,
            aiGenerated: true
          },
          workPhases: [],
          deliverables: [],
          generatedAt: new Date().toISOString(),
          aiGenerationMetadata: {
            model: 'claude-3-5-sonnet',
            version: '2.0',
            promptVersion: '2.1',
            generationTime: 30000,
            tokensUsed: 3500,
            confidence: 0.85,
            iterationsRequired: 1,
            validationPassed: true,
            knowledgeBaseSources: ['RICS', 'RIBA'],
            customizations: []
          },
          validationResults: [],
          complianceChecks: [],
          costEstimate: {
            id: 'cost-id',
            projectId: validRequest.projectId,
            methodology: 'NRM1',
            totalCost: 32000,
            currency: 'GBP',
            breakdown: [],
            confidence: {
              overall: 0.8,
              dataQuality: 0.8,
              marketStability: 0.8,
              projectComplexity: 0.7,
              timeHorizon: 0.9,
              explanation: 'Good confidence',
              factors: []
            },
            marketRates: {
              region: 'UK',
              lastUpdated: new Date().toISOString(),
              source: 'test',
              rates: [],
              labourRates: [],
              overheadFactors: []
            },
            lastUpdated: new Date().toISOString(),
            validUntil: new Date().toISOString(),
            version: 1,
            status: 'draft'
          }
        } as ScopeOfWork,
        generationTime: 30000,
        warnings: [],
        errors: [],
        recommendations: ['Review generated content'],
        nextSteps: ['Approve the SoW'],
        estimatedCost: 32000,
        confidence: 0.85
      };

      mockServiceInstance.generateScopeOfWork.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/sow/generate')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sowId).toBe('generated-sow-id');
      expect(response.body.data.sow).toBeDefined();
      expect(response.body.data.generationTime).toBe(30000);
      expect(response.body.data.estimatedCost).toBe(32000);
      expect(response.body.data.confidence).toBe(0.85);

      expect(mockServiceInstance.generateScopeOfWork).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: validRequest.projectId,
          projectType: validRequest.projectType,
          requirements: validRequest.requirements,
          councilData: validRequest.councilData,
          preferences: validRequest.preferences,
          documents: validRequest.documents
        })
      );
    });

    it('should handle generation failures', async () => {
      const mockResult: SoWGenerationResult = {
        success: false,
        generationTime: 5000,
        warnings: ['Low confidence in AI response'],
        errors: ['Failed to parse structural requirements'],
        recommendations: [],
        nextSteps: [],
        estimatedCost: 0,
        confidence: 0
      };

      mockServiceInstance.generateScopeOfWork.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/sow/generate')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GENERATION_FAILED');
      expect(response.body.error.details.errors).toContain('Failed to parse structural requirements');
      expect(response.body.error.details.warnings).toContain('Low confidence in AI response');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...validRequest,
        projectId: 'invalid-uuid',
        projectType: 'invalid-type',
        requirements: null,
        preferences: null
      };

      const response = await request(app)
        .post('/api/sow/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(4);
      expect(mockServiceInstance.generateScopeOfWork).not.toHaveBeenCalled();
    });

    it('should validate project type', async () => {
      const invalidRequest = {
        ...validRequest,
        projectType: 'invalid-project-type'
      };

      const response = await request(app)
        .post('/api/sow/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details[0].msg).toContain('Valid project type is required');
    });

    it('should validate preferences fields', async () => {
      const invalidRequest = {
        ...validRequest,
        preferences: {
          methodology: 'invalid-methodology',
          detailLevel: 'invalid-detail-level',
          qualityLevel: 'invalid-quality-level'
        }
      };

      const response = await request(app)
        .post('/api/sow/generate')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details.length).toBeGreaterThan(0);
    });

    it('should handle service errors', async () => {
      mockServiceInstance.generateScopeOfWork.mockRejectedValueOnce(new Error('Service unavailable'));

      const response = await request(app)
        .post('/api/sow/generate')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/sow/:sowId', () => {
    const validSowId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve a SoW by ID', async () => {
      const mockSoW: ScopeOfWork = {
        PK: `SOW#${validSowId}`,
        SK: 'METADATA',
        id: validSowId,
        projectId: 'project-id',
        version: 1,
        status: 'generated',
        ribaStages: [],
        specifications: [],
        materials: {
          categories: [],
          totalEstimatedCost: 0,
          currency: 'GBP',
          lastUpdated: new Date().toISOString(),
          supplierRecommendations: [],
          sustainabilityScore: 0,
          aiGenerated: true
        },
        workPhases: [],
        deliverables: [],
        generatedAt: new Date().toISOString(),
        aiGenerationMetadata: {
          model: 'claude-3-5-sonnet',
          version: '2.0',
          promptVersion: '2.1',
          generationTime: 30000,
          tokensUsed: 3500,
          confidence: 0.85,
          iterationsRequired: 1,
          validationPassed: true,
          knowledgeBaseSources: [],
          customizations: []
        },
        validationResults: [],
        complianceChecks: [],
        costEstimate: {
          id: 'cost-id',
          projectId: 'project-id',
          methodology: 'NRM1',
          totalCost: 0,
          currency: 'GBP',
          breakdown: [],
          confidence: {
            overall: 0.8,
            dataQuality: 0.8,
            marketStability: 0.8,
            projectComplexity: 0.7,
            timeHorizon: 0.9,
            explanation: 'Good confidence',
            factors: []
          },
          marketRates: {
            region: 'UK',
            lastUpdated: new Date().toISOString(),
            source: 'test',
            rates: [],
            labourRates: [],
            overheadFactors: []
          },
          lastUpdated: new Date().toISOString(),
          validUntil: new Date().toISOString(),
          version: 1,
          status: 'draft'
        },
        GSI4PK: 'project-id',
        GSI4SK: 'generated#1'
      };

      mockServiceInstance.getScopeOfWork.mockResolvedValueOnce(mockSoW);

      const response = await request(app)
        .get(`/api/sow/${validSowId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sow.id).toBe(validSowId);
      expect(response.body.data.sow.GSI4PK).toBeUndefined();
      expect(response.body.data.sow.GSI4SK).toBeUndefined();

      expect(mockServiceInstance.getScopeOfWork).toHaveBeenCalledWith(validSowId);
    });

    it('should return 404 for non-existent SoW', async () => {
      mockServiceInstance.getScopeOfWork.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sow/${validSowId}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SOW_NOT_FOUND');
    });

    it('should validate SoW ID format', async () => {
      const response = await request(app)
        .get('/api/sow/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockServiceInstance.getScopeOfWork).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockServiceInstance.getScopeOfWork.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .get(`/api/sow/${validSowId}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/sow/project/:projectId', () => {
    const validProjectId = '123e4567-e89b-12d3-a456-426614174000';

    it('should retrieve all SoWs for a project', async () => {
      const mockSoWs: ScopeOfWork[] = [
        {
          id: 'sow-1',
          projectId: validProjectId,
          version: 1,
          status: 'generated',
          GSI4PK: validProjectId,
          GSI4SK: 'generated#1'
        } as ScopeOfWork,
        {
          id: 'sow-2',
          projectId: validProjectId,
          version: 2,
          status: 'approved',
          GSI4PK: validProjectId,
          GSI4SK: 'approved#2'
        } as ScopeOfWork
      ];

      mockServiceInstance.getScopeOfWorksByProject.mockResolvedValueOnce(mockSoWs);

      const response = await request(app)
        .get(`/api/sow/project/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sows).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.sows[0].GSI4PK).toBeUndefined();
      expect(response.body.data.sows[0].GSI4SK).toBeUndefined();

      expect(mockServiceInstance.getScopeOfWorksByProject).toHaveBeenCalledWith(validProjectId);
    });

    it('should return empty array for project with no SoWs', async () => {
      mockServiceInstance.getScopeOfWorksByProject.mockResolvedValueOnce([]);

      const response = await request(app)
        .get(`/api/sow/project/${validProjectId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sows).toHaveLength(0);
      expect(response.body.data.count).toBe(0);
    });

    it('should validate project ID format', async () => {
      const response = await request(app)
        .get('/api/sow/project/invalid-id')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockServiceInstance.getScopeOfWorksByProject).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/sow/:sowId/approve', () => {
    const validSowId = '123e4567-e89b-12d3-a456-426614174000';

    it('should approve a SoW', async () => {
      const mockApprovedSoW: ScopeOfWork = {
        id: validSowId,
        projectId: 'project-id',
        version: 1,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        GSI4PK: 'project-id',
        GSI4SK: 'approved#1'
      } as ScopeOfWork;

      mockServiceInstance.approveScopeOfWork.mockResolvedValueOnce(mockApprovedSoW);

      const response = await request(app)
        .put(`/api/sow/${validSowId}/approve`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sow.status).toBe('approved');
      expect(response.body.data.sow.approvedAt).toBeDefined();
      expect(response.body.data.message).toContain('approved successfully');
      expect(response.body.data.sow.GSI4PK).toBeUndefined();

      expect(mockServiceInstance.approveScopeOfWork).toHaveBeenCalledWith(validSowId);
    });

    it('should return 404 for non-existent SoW', async () => {
      mockServiceInstance.approveScopeOfWork.mockRejectedValueOnce(new Error('ScopeOfWork not found'));

      const response = await request(app)
        .put(`/api/sow/${validSowId}/approve`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SOW_NOT_FOUND');
    });

    it('should validate SoW ID format', async () => {
      const response = await request(app)
        .put('/api/sow/invalid-id/approve')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(mockServiceInstance.approveScopeOfWork).not.toHaveBeenCalled();
    });

    it('should handle service errors', async () => {
      mockServiceInstance.approveScopeOfWork.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put(`/api/sow/${validSowId}/approve`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('GET /api/sow/:sowId/validation', () => {
    const validSowId = '123e4567-e89b-12d3-a456-426614174000';

    it('should return validation summary for a SoW', async () => {
      const mockSoW: ScopeOfWork = {
        PK: `SOW#${validSowId}`,
        SK: 'METADATA',
        id: validSowId,
        projectId: 'project-id',
        version: 1,
        status: 'generated',
        ribaStages: [],
        specifications: [],
        materials: {
          categories: [],
          totalEstimatedCost: 0,
          currency: 'GBP',
          lastUpdated: new Date().toISOString(),
          supplierRecommendations: [],
          sustainabilityScore: 0,
          aiGenerated: true
        },
        workPhases: [],
        deliverables: [],
        generatedAt: new Date().toISOString(),
        aiGenerationMetadata: {
          model: 'claude-3-5-sonnet',
          version: '2.0',
          promptVersion: '2.1',
          generationTime: 30000,
          tokensUsed: 3500,
          confidence: 0.85,
          iterationsRequired: 1,
          validationPassed: true,
          knowledgeBaseSources: [],
          customizations: []
        },
        validationResults: [
          {
            validator: 'ai',
            validationType: 'completeness',
            passed: true,
            score: 85,
            issues: [],
            recommendations: ['Add more detail'],
            validatedAt: new Date().toISOString()
          }
        ],
        complianceChecks: [],
        costEstimate: {
          id: 'cost-id',
          projectId: 'project-id',
          methodology: 'NRM1',
          totalCost: 0,
          currency: 'GBP',
          breakdown: [],
          confidence: {
            overall: 0.8,
            dataQuality: 0.8,
            marketStability: 0.8,
            projectComplexity: 0.7,
            timeHorizon: 0.9,
            explanation: 'Good confidence',
            factors: []
          },
          marketRates: {
            region: 'UK',
            lastUpdated: new Date().toISOString(),
            source: 'test',
            rates: [],
            labourRates: [],
            overheadFactors: []
          },
          lastUpdated: new Date().toISOString(),
          validUntil: new Date().toISOString(),
          version: 1,
          status: 'draft'
        }
      };

      mockServiceInstance.getScopeOfWork.mockResolvedValueOnce(mockSoW);

      const response = await request(app)
        .get(`/api/sow/${validSowId}/validation`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validationSummary).toBeDefined();
      expect(response.body.data.validationResults).toHaveLength(1);
      expect(response.body.data.validationSummary.overallScore).toBe(85);
    });

    it('should return 404 for non-existent SoW', async () => {
      mockServiceInstance.getScopeOfWork.mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/sow/${validSowId}/validation`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SOW_NOT_FOUND');
    });
  });
});