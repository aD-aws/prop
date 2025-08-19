import { Router, Request, Response } from 'express';
import Joi from 'joi';
import { propertyService } from '../services/PropertyService';
import { logger } from '../utils/logger';
import { ApiResponse, Address } from '../types';
import { validateRequest } from '../middleware/validation';

const router = Router();

// Validation schemas
const addressSchema = Joi.object({
  line1: Joi.string().required().min(1).max(100),
  line2: Joi.string().optional().max(100),
  city: Joi.string().required().min(1).max(50),
  county: Joi.string().optional().max(50),
  postcode: Joi.string().required().min(5).max(10),
  country: Joi.string().optional().default('England')
});

const postcodeSchema = Joi.object({
  postcode: Joi.string().required().min(5).max(10)
});

/**
 * POST /api/property/validate-address
 * Validates a full property address and retrieves council data
 */
router.post('/validate-address', validateRequest({ body: addressSchema }), async (req: Request, res: Response) => {
  try {
    const address: Address = req.body;
    
    logger.info('Address validation requested', { 
      postcode: address.postcode,
      city: address.city 
    });

    const result = await propertyService.validatePropertyAddress(address);

    const response: ApiResponse = {
      success: result.valid,
      data: {
        valid: result.valid,
        errors: result.errors,
        normalizedAddress: result.normalizedAddress,
        postcodeDetails: result.postcodeResult,
        councilData: result.councilData?.data,
        councilDataSource: result.councilData?.source,
        councilDataLastUpdated: result.councilData?.lastUpdated
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    if (!result.valid) {
      response.error = {
        code: 'VALIDATION_FAILED',
        message: 'Address validation failed',
        details: result.errors
      };
    }

    const statusCode = result.valid ? 200 : 400;
    res.status(statusCode).json(response);

  } catch (error: any) {
    logger.error('Address validation endpoint error', {
      error: error.message,
      stack: error.stack
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during address validation'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(500).json(response);
  }
});

/**
 * POST /api/property/validate-postcode
 * Validates just a postcode
 */
router.post('/validate-postcode', validateRequest({ body: postcodeSchema }), async (req: Request, res: Response) => {
  try {
    const { postcode } = req.body;
    
    logger.info('Postcode validation requested', { postcode });

    const result = await propertyService.validatePostcode(postcode);

    const response: ApiResponse = {
      success: result.valid,
      data: result,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    if (!result.valid) {
      response.error = {
        code: 'INVALID_POSTCODE',
        message: result.error || 'Invalid postcode'
      };
    }

    const statusCode = result.valid ? 200 : 400;
    res.status(statusCode).json(response);

  } catch (error: any) {
    logger.error('Postcode validation endpoint error', {
      error: error.message,
      stack: error.stack
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during postcode validation'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/property/council-data/:postcode
 * Gets council data for a specific postcode
 */
router.get('/council-data/:postcode', async (req: Request, res: Response) => {
  try {
    const { postcode } = req.params;
    
    // Validate postcode parameter
    const { error } = postcodeSchema.validate({ postcode });
    if (error) {
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'INVALID_POSTCODE',
          message: 'Invalid postcode format'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };
      res.status(400).json(response);
      return;
    }

    logger.info('Council data requested', { postcode });

    const result = await propertyService.getCouncilDataByPostcode(postcode);

    const response: ApiResponse = {
      success: result.success,
      data: {
        councilData: result.data,
        source: result.source,
        lastUpdated: result.lastUpdated
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    if (!result.success) {
      response.error = {
        code: 'COUNCIL_DATA_ERROR',
        message: result.error || 'Failed to retrieve council data'
      };
    }

    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(response);

  } catch (error: any) {
    logger.error('Council data endpoint error', {
      error: error.message,
      stack: error.stack
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during council data retrieval'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(500).json(response);
  }
});

/**
 * DELETE /api/property/council-data/cache/:localAuthority?
 * Clears council data cache for a specific local authority or all
 */
router.delete('/council-data/cache/:localAuthority?', async (req: Request, res: Response) => {
  try {
    const { localAuthority } = req.params;
    
    logger.info('Council data cache clear requested', { localAuthority });

    await propertyService.refreshCouncilData(localAuthority || '');

    const response: ApiResponse = {
      success: true,
      data: {
        message: localAuthority 
          ? `Cache cleared for ${localAuthority}` 
          : 'All council data cache cleared'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Cache clear endpoint error', {
      error: error.message,
      stack: error.stack
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error during cache clear'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(500).json(response);
  }
});

/**
 * GET /api/property/health
 * Gets service health status
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await propertyService.getServiceHealth();

    const response: ApiResponse = {
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(200).json(response);

  } catch (error: any) {
    logger.error('Health check endpoint error', {
      error: error.message,
      stack: error.stack
    });

    const response: ApiResponse = {
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    };

    res.status(500).json(response);
  }
});

export default router;