import { Router, Response } from 'express';
import { complianceService } from '../services/ComplianceService';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, commonSchemas } from '../middleware/validation';
import { ApiResponse, AuthenticatedRequest } from '../types';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = Router();

// Validation schemas for compliance endpoints
const complianceValidationSchemas = {
  complianceCheck: Joi.object({
    projectType: Joi.string().valid(
      'loft-conversion', 'rear-extension', 'side-extension',
      'bathroom-renovation', 'kitchen-renovation', 'conservatory',
      'garage-conversion', 'basement-conversion', 'roof-replacement', 'other'
    ).required(),
    requirements: Joi.object({
      description: Joi.string().required(),
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
        startDate: Joi.string().isoDate().optional(),
        endDate: Joi.string().isoDate().optional(),
        flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').required()
      }).required(),
      budget: Joi.object({
        min: Joi.number().positive().required(),
        max: Joi.number().positive().required(),
        currency: Joi.string().valid('GBP').required()
      }).required(),
      specialRequirements: Joi.array().items(Joi.string()).required()
    }).required(),
    documents: Joi.array().items(Joi.object()).required()
  }),

  projectTypeOnly: Joi.object({
    projectType: Joi.string().valid(
      'loft-conversion', 'rear-extension', 'side-extension',
      'bathroom-renovation', 'kitchen-renovation', 'conservatory',
      'garage-conversion', 'basement-conversion', 'roof-replacement', 'other'
    ).required(),
    requirements: Joi.object().required(),
    documents: Joi.array().items(Joi.object()).optional()
  }),

  projectTypeAndRequirements: Joi.object({
    projectType: Joi.string().valid(
      'loft-conversion', 'rear-extension', 'side-extension',
      'bathroom-renovation', 'kitchen-renovation', 'conservatory',
      'garage-conversion', 'basement-conversion', 'roof-replacement', 'other'
    ).required(),
    requirements: Joi.object().required()
  })
};

/**
 * POST /api/compliance/check
 * Perform comprehensive compliance check on a project
 */
router.post('/check',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectType, requirements, documents } = req.body;
      const userId = req.user!.userId;

      logger.info('Compliance check requested', { 
        userId, 
        projectType, 
        documentsCount: documents.length 
      });

      const result = await complianceService.performComplianceCheck(
        projectType,
        requirements,
        documents
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('Compliance check failed', { 
        error, 
        userId: req.user?.userId,
        projectType: req.body?.projectType 
      });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'COMPLIANCE_CHECK_FAILED',
          message: 'Failed to perform compliance check',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/compliance/rics-check
 * Perform RICS standards compliance check
 */
router.post('/rics-check',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectType, requirements, documents } = req.body;
      const userId = req.user!.userId;

      logger.info('RICS compliance check requested', { userId, projectType });

      // Access private method through service instance
      const result = await (complianceService as any).checkRICSStandards(
        projectType,
        requirements,
        documents
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('RICS compliance check failed', { error, userId: req.user?.userId });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RICS_CHECK_FAILED',
          message: 'Failed to perform RICS compliance check',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/compliance/riba-validation
 * Validate RIBA Plan of Work stages
 */
router.post('/riba-validation',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectType, requirements } = req.body;
      const userId = req.user!.userId;

      logger.info('RIBA validation requested', { userId, projectType });

      const result = await (complianceService as any).validateRIBAStages(
        projectType,
        requirements
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('RIBA validation failed', { error, userId: req.user?.userId });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RIBA_VALIDATION_FAILED',
          message: 'Failed to perform RIBA validation',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/compliance/nhbc-check
 * Check NHBC standards for residential projects
 */
router.post('/nhbc-check',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectType, requirements, documents } = req.body;
      const userId = req.user!.userId;

      logger.info('NHBC compliance check requested', { userId, projectType });

      const result = await (complianceService as any).checkNHBCStandards(
        projectType,
        requirements,
        documents
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('NHBC compliance check failed', { error, userId: req.user?.userId });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NHBC_CHECK_FAILED',
          message: 'Failed to perform NHBC compliance check',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * POST /api/compliance/building-control
 * Check Building Control approval requirements
 */
router.post('/building-control',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { projectType, requirements } = req.body;
      const userId = req.user!.userId;

      logger.info('Building Control requirements check requested', { userId, projectType });

      const result = await (complianceService as any).checkBuildingControlRequirements(
        projectType,
        requirements
      );

      const response: ApiResponse = {
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('Building Control requirements check failed', { error, userId: req.user?.userId });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'BUILDING_CONTROL_CHECK_FAILED',
          message: 'Failed to check Building Control requirements',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

/**
 * GET /api/compliance/knowledge-base
 * Get compliance knowledge base information
 */
router.get('/knowledge-base',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.userId;

      logger.info('Knowledge base requested', { userId });

      // Access knowledge base through service instance
      const knowledgeBase = (complianceService as any).knowledgeBase;

      const response: ApiResponse = {
        success: true,
        data: knowledgeBase,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);

    } catch (error) {
      logger.error('Knowledge base retrieval failed', { error, userId: req.user?.userId });

      const response: ApiResponse = {
        success: false,
        error: {
          code: 'KNOWLEDGE_BASE_FAILED',
          message: 'Failed to retrieve knowledge base',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(500).json(response);
    }
  }
);

export default router;