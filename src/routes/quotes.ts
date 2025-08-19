import { Router, Response } from 'express';
import { QuoteService } from '../services/QuoteService';
import { authenticateToken as authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { 
  QuoteSubmissionRequest, 
  QuoteStatus, 
  CommunicationType,
  AuthenticatedRequest 
} from '../types';
const { body, param, query } = require('express-validator');
import { logger } from '../utils/logger';

const router = Router();
const quoteService = new QuoteService();

// Validation schemas
const submitQuoteValidation = [
  body('sowId').isUUID().withMessage('Valid SoW ID is required'),
  body('builderId').isUUID().withMessage('Valid builder ID is required'),
  body('quote.totalPrice').isFloat({ min: 0 }).withMessage('Total price must be a positive number'),
  body('quote.breakdown').isArray({ min: 1 }).withMessage('Quote breakdown is required'),
  body('quote.timeline.totalDuration').isInt({ min: 1 }).withMessage('Timeline duration must be positive'),
  body('quote.warranty.workmanshipWarranty.duration').isInt({ min: 1 }).withMessage('Workmanship warranty duration is required'),
  body('quote.warranty.materialsWarranty.duration').isInt({ min: 1 }).withMessage('Materials warranty duration is required'),
  body('quote.validUntil').isISO8601().withMessage('Valid until date must be in ISO format'),
  body('quote.methodology').isIn(['NRM1', 'NRM2']).withMessage('Methodology must be NRM1 or NRM2')
];

const distributeQuotesValidation = [
  body('sowId').isUUID().withMessage('Valid SoW ID is required'),
  body('builderIds').isArray({ min: 1 }).withMessage('At least one builder ID is required'),
  body('builderIds.*').isUUID().withMessage('All builder IDs must be valid UUIDs'),
  body('dueDate').isISO8601().withMessage('Due date must be in ISO format')
];

const communicationValidation = [
  body('sowId').isUUID().withMessage('Valid SoW ID is required'),
  body('builderId').isUUID().withMessage('Valid builder ID is required'),
  body('type').isIn(['clarification-request', 'specification-query', 'site-access-request', 'variation-proposal', 'general-inquiry', 'response']).withMessage('Invalid communication type'),
  body('subject').isLength({ min: 1, max: 200 }).withMessage('Subject is required and must be under 200 characters'),
  body('message').isLength({ min: 1, max: 5000 }).withMessage('Message is required and must be under 5000 characters')
];

/**
 * @route POST /api/quotes/submit
 * @desc Submit a quote for a SoW
 * @access Private (Builder only)
 */
router.post('/submit', 
  authMiddleware, 
  submitQuoteValidation,
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { user } = req;
      
      // Verify user is a builder
      if (user?.userType !== 'builder') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only builders can submit quotes'
          }
        });
      }

      const request: QuoteSubmissionRequest = {
        ...req.body,
        builderId: user.userId // Use authenticated user's ID
      };

      const result = await quoteService.submitQuote(request);

      if (!result.success) {
        return res.status(400).json(result);
      }

      logger.info('Quote submitted successfully', { 
        quoteId: result.quoteId, 
        builderId: user.userId,
        sowId: request.sowId 
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error in submit quote endpoint', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to submit quote'
        }
      });
    }
  }
);

/**
 * @route GET /api/quotes/:quoteId
 * @desc Get a specific quote
 * @access Private
 */
router.get('/:quoteId',
  authMiddleware,
  param('quoteId').isUUID().withMessage('Valid quote ID is required'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { quoteId } = req.params;
      const result = await quoteService.getQuote(quoteId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      // Check if user has permission to view this quote
      const quote = result.data!;
      const { user } = req;
      
      if (user?.userType === 'builder' && quote.builderId !== user.userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You can only view your own quotes'
          }
        });
      }

      res.json(result);

    } catch (error) {
      logger.error('Error in get quote endpoint', { error, quoteId: req.params.quoteId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve quote'
        }
      });
    }
  }
);

/**
 * @route GET /api/quotes/sow/:sowId
 * @desc Get all quotes for a SoW
 * @access Private (Homeowner or Admin only)
 */
router.get('/sow/:sowId',
  authMiddleware,
  param('sowId').isUUID().withMessage('Valid SoW ID is required'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sowId } = req.params;
      const { user } = req;

      // Only homeowners and admins can view all quotes for a SoW
      if (user?.userType === 'builder') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Builders cannot view other builders\' quotes'
          }
        });
      }

      const result = await quoteService.getQuotesForSoW(sowId);
      res.json(result);

    } catch (error) {
      logger.error('Error in get SoW quotes endpoint', { error, sowId: req.params.sowId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve quotes'
        }
      });
    }
  }
);

/**
 * @route GET /api/quotes/builder/my-quotes
 * @desc Get builder's own quotes
 * @access Private (Builder only)
 */
router.get('/builder/my-quotes',
  authMiddleware,
  query('status').optional().isIn(['draft', 'submitted', 'under-review', 'clarification-requested', 'revised', 'selected', 'rejected', 'withdrawn', 'expired']).withMessage('Invalid status'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { user } = req;
      
      if (user?.userType !== 'builder') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only builders can access this endpoint'
          }
        });
      }

      const status = req.query.status as QuoteStatus | undefined;
      const result = await quoteService.getBuilderQuotes(user.userId, status);
      
      res.json(result);

    } catch (error) {
      logger.error('Error in get builder quotes endpoint', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve builder quotes'
        }
      });
    }
  }
);

/**
 * @route PUT /api/quotes/:quoteId/status
 * @desc Update quote status
 * @access Private (Homeowner or Admin only)
 */
router.put('/:quoteId/status',
  authMiddleware,
  param('quoteId').isUUID().withMessage('Valid quote ID is required'),
  body('status').isIn(['under-review', 'clarification-requested', 'selected', 'rejected']).withMessage('Invalid status'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { quoteId } = req.params;
      const { status } = req.body;
      const { user } = req;

      // Only homeowners and admins can update quote status
      if (user?.userType === 'builder') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Builders cannot update quote status'
          }
        });
      }

      const result = await quoteService.updateQuoteStatus(quoteId, status);

      if (!result.success) {
        return res.status(404).json(result);
      }

      logger.info('Quote status updated', { quoteId, status, userId: user?.userId });
      res.json(result);

    } catch (error) {
      logger.error('Error in update quote status endpoint', { error, quoteId: req.params.quoteId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update quote status'
        }
      });
    }
  }
);

/**
 * @route POST /api/quotes/distribute
 * @desc Distribute SoW to selected builders
 * @access Private (Homeowner only)
 */
router.post('/distribute',
  authMiddleware,
  distributeQuotesValidation,
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { user } = req;
      
      if (user?.userType !== 'homeowner') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only homeowners can distribute SoWs'
          }
        });
      }

      const { sowId, builderIds, dueDate } = req.body;
      const result = await quoteService.distributeToBuilders(sowId, user.userId, builderIds, dueDate);

      if (!result.success) {
        return res.status(400).json(result);
      }

      logger.info('SoW distributed to builders', { 
        sowId, 
        builderCount: builderIds.length, 
        homeownerId: user.userId 
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error in distribute quotes endpoint', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to distribute SoW'
        }
      });
    }
  }
);

/**
 * @route GET /api/quotes/compare/:sowId
 * @desc Compare quotes for a SoW
 * @access Private (Homeowner or Admin only)
 */
router.get('/compare/:sowId',
  authMiddleware,
  param('sowId').isUUID().withMessage('Valid SoW ID is required'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sowId } = req.params;
      const { user } = req;

      if (user?.userType === 'builder') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Builders cannot access quote comparisons'
          }
        });
      }

      const result = await quoteService.compareQuotes(sowId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Error in compare quotes endpoint', { error, sowId: req.params.sowId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to compare quotes'
        }
      });
    }
  }
);

/**
 * @route POST /api/quotes/communication
 * @desc Create communication between builder and homeowner
 * @access Private
 */
router.post('/communication',
  authMiddleware,
  communicationValidation,
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sowId, builderId, type, subject, message, attachments } = req.body;
      const { user } = req;

      // Determine homeowner ID based on user type
      let homeownerId: string;
      if (user?.userType === 'homeowner') {
        homeownerId = user.userId;
      } else if (user?.userType === 'builder') {
        // For builder communications, we need to get the homeowner from the SoW
        // This would require additional lookup - simplified for now
        homeownerId = 'homeowner-from-sow'; // TODO: Implement proper lookup
      } else {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'Only homeowners and builders can create communications'
          }
        });
      }

      const result = await quoteService.createCommunication(
        sowId, 
        builderId, 
        homeownerId, 
        type as CommunicationType, 
        subject, 
        message, 
        attachments
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      logger.info('Communication created', { 
        communicationId: result.data?.id, 
        type, 
        userId: user?.userId 
      });

      res.status(201).json(result);

    } catch (error) {
      logger.error('Error in create communication endpoint', { error, userId: req.user?.userId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create communication'
        }
      });
    }
  }
);

/**
 * @route GET /api/quotes/communication/:sowId
 * @desc Get communications for a SoW
 * @access Private
 */
router.get('/communication/:sowId',
  authMiddleware,
  param('sowId').isUUID().withMessage('Valid SoW ID is required'),
  validateRequest,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { sowId } = req.params;
      const result = await quoteService.getCommunications(sowId);

      if (!result.success) {
        return res.status(404).json(result);
      }

      res.json(result);

    } catch (error) {
      logger.error('Error in get communications endpoint', { error, sowId: req.params.sowId });
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to retrieve communications'
        }
      });
    }
  }
);

export default router;