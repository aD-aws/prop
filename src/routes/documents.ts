import express from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { documentService } from '../services/DocumentService';
import { ApiResponse } from '../types';
import { logger } from '../utils/logger';
import Joi from 'joi';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/tiff',
      'application/dwg',
      'application/dxf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  }
});

// Validation schemas
const uploadDocumentSchema = Joi.object({
  projectId: Joi.string().uuid().required()
});

const processDocumentSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  documentId: Joi.string().uuid().required()
});

const getDocumentSchema = Joi.object({
  projectId: Joi.string().uuid().required(),
  documentId: Joi.string().uuid().required()
});

/**
 * @route POST /api/documents/upload
 * @desc Upload document to project
 * @access Private
 */
router.post('/upload',
  authenticateToken,
  upload.single('document'),
  validateRequest({ body: uploadDocumentSchema }),
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>): Promise<express.Response<ApiResponse>> => {
    try {
      const { projectId } = req.body;
      const userId = req.user!.userId;
      const file = req.file;

      if (!file) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'NO_FILE',
            message: 'No file provided'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown'
        };
        return res.status(400).json(response);
      }

      const document = await documentService.uploadDocument(projectId, userId, file);

      const response: ApiResponse = {
        success: true,
        data: document,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(201).json(response);

    } catch (error) {
      logger.error('Document upload failed', { error, userId: req.user?.userId });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'UPLOAD_FAILED',
          message: error instanceof Error ? error.message : 'Failed to upload document'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(500).json(response);
    }
  }
);

/**
 * @route POST /api/documents/process
 * @desc Process document with AI analysis
 * @access Private
 */
router.post('/process',
  authenticateToken,
  validateRequest({ body: processDocumentSchema }),
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>): Promise<express.Response<ApiResponse>> => {
    try {
      const { projectId, documentId } = req.body;
      
      // Start processing asynchronously
      const processingResult = await documentService.processDocument(projectId, documentId);

      const response: ApiResponse = {
        success: true,
        data: processingResult,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(200).json(response);

    } catch (error) {
      logger.error('Document processing failed', { error, userId: req.user?.userId });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'PROCESSING_FAILED',
          message: error instanceof Error ? error.message : 'Failed to process document'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(500).json(response);
    }
  }
);

/**
 * @route GET /api/documents/:projectId/:documentId
 * @desc Get document details
 * @access Private
 */
router.get('/:projectId/:documentId',
  authenticateToken,
  validateRequest({ params: getDocumentSchema }),
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>): Promise<express.Response<ApiResponse>> => {
    try {
      const { projectId, documentId } = req.params;
      
      const document = await documentService.getDocument(projectId, documentId);

      if (!document) {
        const response: ApiResponse = {
          success: false,
          error: {
            code: 'DOCUMENT_NOT_FOUND',
            message: 'Document not found'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown'
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse = {
        success: true,
        data: document,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(200).json(response);

    } catch (error) {
      logger.error('Failed to get document', { error, userId: req.user?.userId });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'GET_DOCUMENT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get document'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(500).json(response);
    }
  }
);

/**
 * @route DELETE /api/documents/:projectId/:documentId
 * @desc Delete (archive) document
 * @access Private
 */
router.delete('/:projectId/:documentId',
  authenticateToken,
  validateRequest({ params: getDocumentSchema }),
  async (req: AuthenticatedRequest, res: express.Response<ApiResponse>): Promise<express.Response<ApiResponse>> => {
    try {
      const { projectId, documentId } = req.params;
      const userId = req.user!.userId;
      
      await documentService.deleteDocument(projectId, documentId, userId);

      const response: ApiResponse = {
        success: true,
        data: { message: 'Document archived successfully' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(200).json(response);

    } catch (error) {
      logger.error('Failed to delete document', { error, userId: req.user?.userId });
      
      const response: ApiResponse = {
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to delete document'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      };

      return res.status(500).json(response);
    }
  }
);

export default router;