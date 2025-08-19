import express from 'express';
import Joi from 'joi';
import { SoWGenerationService } from '../services/SoWGenerationService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, commonSchemas } from '../middleware/validation';
import { 
  AuthenticatedRequest, 
  ApiResponse, 
  SoWGenerationRequest,
  SoWGenerationPreferences,
  ProjectType
} from '../types';
import { logger } from '../utils/logger';

const router = express.Router();
const sowGenerationService = new SoWGenerationService();

// Validation schemas
const sowGenerationSchema = {
  body: Joi.object({
    projectId: commonSchemas.id,
    projectType: commonSchemas.projectType,
    requirements: Joi.object({
      description: Joi.string().trim().min(1).required(),
      dimensions: Joi.object({
        length: Joi.number().positive().optional(),
        width: Joi.number().positive().optional(),
        height: Joi.number().positive().optional(),
        area: Joi.number().positive().optional(),
        unit: Joi.string().valid('meters', 'feet').required()
      }).required(),
      materials: Joi.object({
        quality: Joi.string().valid('budget', 'standard', 'premium').required(),
        preferences: Joi.array().items(Joi.string()).required(),
        restrictions: Joi.array().items(Joi.string()).required()
      }).required(),
      timeline: Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').required()
      }).required(),
      budget: Joi.object({
        min: Joi.number().min(0).required(),
        max: Joi.number().min(0).required(),
        currency: Joi.string().valid('GBP').required()
      }).required(),
      specialRequirements: Joi.array().items(Joi.string()).required()
    }).required(),
    councilData: Joi.object({
      conservationArea: Joi.boolean().required(),
      listedBuilding: Joi.boolean().required(),
      planningRestrictions: Joi.array().items(Joi.string()).required(),
      localAuthority: Joi.string().required(),
      contactDetails: Joi.object({
        name: Joi.string().required(),
        phone: Joi.string().optional(),
        email: Joi.string().email().optional(),
        website: Joi.string().uri().optional()
      }).required(),
      lastChecked: Joi.date().iso().required()
    }).required(),
    preferences: Joi.object({
      methodology: Joi.string().valid('standard', 'fast-track', 'detailed', 'premium').required(),
      ribaStages: Joi.array().items(Joi.number().integer().min(0).max(7)).required(),
      detailLevel: Joi.string().valid('basic', 'standard', 'detailed', 'comprehensive').required(),
      sustainabilityFocus: Joi.string().valid('none', 'standard', 'high', 'maximum').required(),
      qualityLevel: Joi.string().valid('budget', 'standard', 'premium', 'luxury').required(),
      timelinePreference: Joi.string().valid('fastest', 'balanced', 'quality-focused').required(),
      customRequirements: Joi.array().items(Joi.string()).required(),
      excludeItems: Joi.array().items(Joi.string()).required()
    }).required(),
    documents: Joi.array().items(Joi.object()).optional(),
    costConstraints: Joi.object({
      maxBudget: Joi.number().positive().optional(),
      priorityAreas: Joi.array().items(Joi.string()).optional(),
      costOptimization: Joi.string().valid('minimize', 'balance', 'quality-first').optional(),
      contingencyPercentage: Joi.number().min(0).max(100).optional(),
      valueEngineering: Joi.boolean().optional()
    }).optional()
  })
};

const sowIdSchema = {
  params: Joi.object({
    sowId: commonSchemas.id
  })
};

const projectIdSchema = {
  params: Joi.object({
    projectId: commonSchemas.id
  })
};

/**
 * @route POST /api/sow/generate
 * @desc Generate Scope of Work for a project
 * @access Private
 */
router.post('/generate', authenticateToken, validateRequest(sowGenerationSchema), async (req: AuthenticatedRequest, res: express.Response) => {
  try {

    const {
      projectId,
      projectType,
      requirements,
      councilData,
      preferences,
      documents = [],
      costConstraints
    } = req.body;

    // Create generation request
    const generationRequest: SoWGenerationRequest = {
      projectId,
      projectType: projectType as ProjectType,
      requirements,
      documents,
      councilData,
      preferences: preferences as SoWGenerationPreferences,
      costConstraints
    };

    logger.info('SoW generation requested', { 
      projectId, 
      projectType, 
      userId: req.user?.userId 
    });

    // Generate SoW
    const result = await sowGenerationService.generateScopeOfWork(generationRequest);

    if (!result.success) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: 'Failed to generate Scope of Work',
          details: {
            errors: result.errors,
            warnings: result.warnings
          }
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };
      return res.status(500).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        sowId: result.sowId,
        sow: result.sow,
        generationTime: result.generationTime,
        estimatedCost: result.estimatedCost,
        confidence: result.confidence,
        warnings: result.warnings,
        recommendations: result.recommendations,
        nextSteps: result.nextSteps
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    logger.info('SoW generation completed', { 
      projectId, 
      sowId: result.sowId,
      generationTime: result.generationTime,
      confidence: result.confidence
    });

    return res.status(201).json(response);

  } catch (error) {
    logger.error('SoW generation endpoint error', { 
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during SoW generation'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.status(500).json(response);
  }
});

/**
 * @route GET /api/sow/:sowId
 * @desc Get Scope of Work by ID
 * @access Private
 */
router.get('/:sowId', authenticateToken, validateRequest(sowIdSchema), async (req: AuthenticatedRequest, res: express.Response) => {
  try {

    const { sowId } = req.params;
    const sow = await sowGenerationService.getScopeOfWork(sowId);

    if (!sow) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SOW_NOT_FOUND',
          message: 'Scope of Work not found'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse = {
      success: true,
      data: {
        sow: {
          ...sow,
          GSI4PK: undefined,
          GSI4SK: undefined
        }
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.json(response);

  } catch (error) {
    logger.error('Get SoW endpoint error', { 
      sowId: req.params.sowId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.status(500).json(response);
  }
});

/**
 * @route GET /api/sow/project/:projectId
 * @desc Get all Scopes of Work for a project
 * @access Private
 */
router.get('/project/:projectId', authenticateToken, validateRequest(projectIdSchema), async (req: AuthenticatedRequest, res: express.Response) => {
  try {

    const { projectId } = req.params;
    const sows = await sowGenerationService.getScopeOfWorksByProject(projectId);

    // Remove GSI fields from response
    const sanitizedSows = sows.map(sow => ({
      ...sow,
      GSI4PK: undefined,
      GSI4SK: undefined
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        sows: sanitizedSows,
        count: sanitizedSows.length
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.json(response);

  } catch (error) {
    logger.error('Get SoWs by project endpoint error', { 
      projectId: req.params.projectId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.status(500).json(response);
  }
});

/**
 * @route PUT /api/sow/:sowId/approve
 * @desc Approve a Scope of Work
 * @access Private
 */
router.put('/:sowId/approve', authenticateToken, validateRequest(sowIdSchema), async (req: AuthenticatedRequest, res: express.Response) => {
  try {

    const { sowId } = req.params;
    
    logger.info('SoW approval requested', { 
      sowId, 
      userId: req.user?.userId 
    });

    const approvedSoW = await sowGenerationService.approveScopeOfWork(sowId);

    const response: ApiResponse = {
      success: true,
      data: {
        sow: {
          ...approvedSoW,
          GSI4PK: undefined,
          GSI4SK: undefined
        },
        message: 'Scope of Work approved successfully'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    logger.info('SoW approved', { sowId, userId: req.user?.userId });

    return res.json(response);

  } catch (error) {
    logger.error('SoW approval endpoint error', { 
      sowId: req.params.sowId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: error instanceof Error && error.message.includes('not found') ? 'SOW_NOT_FOUND' : 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.status(error instanceof Error && error.message.includes('not found') ? 404 : 500).json(response);
  }
});

/**
 * @route GET /api/sow/:sowId/validation
 * @desc Get validation summary for a Scope of Work
 * @access Private
 */
router.get('/:sowId/validation', authenticateToken, validateRequest(sowIdSchema), async (req: AuthenticatedRequest, res: express.Response) => {
  try {

    const { sowId } = req.params;
    const sow = await sowGenerationService.getScopeOfWork(sowId);

    if (!sow) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'SOW_NOT_FOUND',
          message: 'Scope of Work not found'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };
      return res.status(404).json(response);
    }

    // Import ScopeOfWorkModel to get validation summary
    const { ScopeOfWorkModel } = await import('../models/ScopeOfWork');
    const validationSummary = ScopeOfWorkModel.getValidationSummary(sow);

    const response: ApiResponse = {
      success: true,
      data: {
        validationSummary,
        validationResults: sow.validationResults
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.json(response);

  } catch (error) {
    logger.error('SoW validation endpoint error', { 
      sowId: req.params.sowId,
      error: error instanceof Error ? error.message : 'Unknown error',
      userId: req.user?.userId
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    return res.status(500).json(response);
  }
});

export default router;