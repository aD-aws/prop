import express, { Response } from 'express';
import Joi from 'joi';
import { AuthenticatedRequest, ApiResponse, CostEstimationRequest, CostEstimate, CostUpdateResult } from '../types';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, commonSchemas } from '../middleware/validation';
import CostEstimationService from '../services/CostEstimationService';
import { logger } from '../utils/logger';

const router = express.Router();

// Validation schemas for cost estimation
const costEstimationSchemas = {
  generateEstimate: Joi.object({
    projectId: Joi.string().trim().min(1).required(),
    projectType: commonSchemas.projectType,
    requirements: Joi.object({
      description: Joi.string().trim().min(1).max(500).required(),
      dimensions: Joi.object({
        length: Joi.number().positive().optional(),
        width: Joi.number().positive().optional(),
        height: Joi.number().positive().optional(),
        area: Joi.number().positive().optional(),
        unit: Joi.string().valid('meters', 'feet').required()
      }).required(),
      materials: Joi.object({
        quality: Joi.string().valid('budget', 'standard', 'premium').required(),
        preferences: Joi.array().items(Joi.string().trim().min(1)).required(),
        restrictions: Joi.array().items(Joi.string().trim().min(1)).required()
      }).required(),
      timeline: Joi.object({
        startDate: Joi.date().optional(),
        endDate: Joi.date().optional(),
        flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').required()
      }).optional(),
      budget: Joi.object({
        min: Joi.number().positive().required(),
        max: Joi.number().positive().min(Joi.ref('min')).required(),
        currency: Joi.string().valid('GBP').required()
      }).required(),
      specialRequirements: Joi.array().items(Joi.string().trim().min(1)).required()
    }).required(),
    location: Joi.object({
      line1: Joi.string().trim().min(1).max(100).required(),
      line2: Joi.string().trim().max(100).optional(),
      city: Joi.string().trim().min(1).max(50).required(),
      county: Joi.string().trim().min(1).max(50).required(),
      postcode: commonSchemas.postcode,
      country: Joi.string().trim().min(1).max(50).required()
    }).required(),
    timeline: Joi.object({
      startDate: Joi.date().optional(),
      endDate: Joi.date().optional(),
      flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').optional()
    }).optional(),
    qualityLevel: Joi.string().valid('budget', 'standard', 'premium').optional(),
    includeContingency: Joi.boolean().optional(),
    contingencyPercentage: Joi.number().min(0).max(50).optional()
  }),

  updateEstimate: Joi.object({
    estimateId: Joi.string().uuid().required()
  })
};

/**
 * Generate NRM1 cost estimate
 */
router.post('/estimate/nrm1',
  authenticateToken,
  validateRequest({ body: costEstimationSchemas.generateEstimate }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request: CostEstimationRequest = {
        ...req.body,
        methodology: 'NRM1'
      };

      logger.info(`Generating NRM1 cost estimate for project ${request.projectId} by user ${req.user?.userId}`);

      const estimate = await CostEstimationService.generateNRM1Estimate(request);

      const response: ApiResponse<CostEstimate> = {
        success: true,
        data: estimate,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error generating NRM1 cost estimate:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'ESTIMATION_ERROR',
          message: 'Failed to generate cost estimate',
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
 * Generate NRM2 cost estimate
 */
router.post('/estimate/nrm2',
  authenticateToken,
  validateRequest({ body: costEstimationSchemas.generateEstimate }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request: CostEstimationRequest = {
        ...req.body,
        methodology: 'NRM2'
      };

      logger.info(`Generating NRM2 cost estimate for project ${request.projectId} by user ${req.user?.userId}`);

      const estimate = await CostEstimationService.generateNRM2Estimate(request);

      const response: ApiResponse<CostEstimate> = {
        success: true,
        data: estimate,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(201).json(response);
    } catch (error) {
      logger.error('Error generating NRM2 cost estimate:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'ESTIMATION_ERROR',
          message: 'Failed to generate cost estimate',
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
 * Update cost estimate with latest market rates
 */
router.put('/estimate/:estimateId/update',
  authenticateToken,
  validateRequest({ 
    params: Joi.object({
      estimateId: Joi.string().trim().min(1).required()
    })
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { estimateId } = req.params;

      logger.info(`Updating cost estimate ${estimateId} by user ${req.user?.userId}`);

      const updateResult = await CostEstimationService.updateCostEstimate(estimateId);

      const response: ApiResponse<CostUpdateResult> = {
        success: true,
        data: updateResult,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.json(response);
    } catch (error) {
      logger.error('Error updating cost estimate:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Failed to update cost estimate',
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
 * Get cost estimate by ID
 */
router.get('/estimate/:estimateId',
  authenticateToken,
  validateRequest({ 
    params: Joi.object({
      estimateId: Joi.string().trim().min(1).required()
    })
  }),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { estimateId } = req.params;

      // This would typically retrieve from database
      // For now, we'll return a not implemented response
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'NOT_IMPLEMENTED',
          message: 'Estimate retrieval not yet implemented - estimates are cached in memory only'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      res.status(501).json(response);
    } catch (error) {
      logger.error('Error retrieving cost estimate:', error);
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'RETRIEVAL_ERROR',
          message: 'Failed to retrieve cost estimate',
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