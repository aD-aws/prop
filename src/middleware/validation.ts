import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { logger } from '../utils/logger';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    // Validate request body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query parameters
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate path parameters
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      logger.warn('Request validation failed:', { errors, url: req.url, method: req.method });
      
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
      return;
    }

    next();
  };
};

// Common validation schemas
export const commonSchemas = {
  id: Joi.string().uuid().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]')).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'
    }),
  postcode: Joi.string().pattern(new RegExp('^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$', 'i')).required()
    .messages({
      'string.pattern.base': 'Invalid UK postcode format'
    }),
  userType: Joi.string().valid('homeowner', 'builder', 'admin').required(),
  projectType: Joi.string().valid(
    'loft-conversion',
    'rear-extension', 
    'side-extension',
    'bathroom-renovation',
    'kitchen-renovation',
    'conservatory',
    'garage-conversion',
    'basement-conversion',
    'roof-replacement',
    'other'
  ).required(),
  projectStatus: Joi.string().valid(
    'draft',
    'requirements-gathering',
    'council-check',
    'sow-generation',
    'quote-collection',
    'quote-review',
    'contract-generation',
    'active',
    'completed',
    'cancelled'
  ).required(),
};

// User-specific validation schemas
export const userValidationSchemas = {
  register: Joi.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    userType: commonSchemas.userType,
    profile: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).required(),
      lastName: Joi.string().trim().min(1).max(50).required(),
      phone: Joi.string().pattern(new RegExp('^(\\+44|0)[1-9]\\d{8,9}$')).optional()
        .messages({
          'string.pattern.base': 'Invalid UK phone number format'
        }),
      companyName: Joi.string().trim().min(1).max(100).when('$userType', {
        is: 'builder',
        then: Joi.required(),
        otherwise: Joi.optional()
      }),
      certifications: Joi.array().items(Joi.string().trim().min(1)).optional(),
      address: Joi.object({
        line1: Joi.string().trim().min(1).max(100).required(),
        line2: Joi.string().trim().max(100).optional(),
        city: Joi.string().trim().min(1).max(50).required(),
        county: Joi.string().trim().min(1).max(50).required(),
        postcode: commonSchemas.postcode,
        country: Joi.string().trim().min(1).max(50).default('United Kingdom'),
      }).optional(),
      insurance: Joi.object({
        provider: Joi.string().trim().min(1).max(100).required(),
        policyNumber: Joi.string().trim().min(1).max(50).required(),
        expiryDate: Joi.date().greater('now').required(),
        coverageAmount: Joi.number().positive().required(),
      }).when('$userType', {
        is: 'builder',
        then: Joi.optional(),
        otherwise: Joi.forbidden()
      }),
    }).required(),
    gdprConsent: Joi.boolean().valid(true).required(),
  }),

  login: Joi.object({
    email: commonSchemas.email,
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    profile: Joi.object({
      firstName: Joi.string().trim().min(1).max(50).optional(),
      lastName: Joi.string().trim().min(1).max(50).optional(),
      phone: Joi.string().pattern(new RegExp('^(\\+44|0)[1-9]\\d{8,9}$')).optional()
        .messages({
          'string.pattern.base': 'Invalid UK phone number format'
        }),
      companyName: Joi.string().trim().min(1).max(100).optional(),
      certifications: Joi.array().items(Joi.string().trim().min(1)).optional(),
      address: Joi.object({
        line1: Joi.string().trim().min(1).max(100).required(),
        line2: Joi.string().trim().max(100).optional(),
        city: Joi.string().trim().min(1).max(50).required(),
        county: Joi.string().trim().min(1).max(50).required(),
        postcode: commonSchemas.postcode,
        country: Joi.string().trim().min(1).max(50).default('United Kingdom'),
      }).optional(),
      insurance: Joi.object({
        provider: Joi.string().trim().min(1).max(100).required(),
        policyNumber: Joi.string().trim().min(1).max(50).required(),
        expiryDate: Joi.date().greater('now').required(),
        coverageAmount: Joi.number().positive().required(),
      }).optional(),
    }).required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: commonSchemas.password,
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),
};