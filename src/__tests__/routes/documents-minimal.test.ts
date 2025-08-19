/**
 * Minimal test for document routes to verify API endpoints work correctly
 * This test focuses only on the document routes without dependencies on other routes
 */

import request from 'supertest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import documentRoutes from '../../routes/documents';
import { documentService } from '../../services/DocumentService';
import { Document, DocumentProcessingResult } from '../../types';
import { errorHandler } from '../../middleware/errorHandler';

// Mock the document service
jest.mock('../../services/DocumentService', () => ({
  documentService: {
    uploadDocument: jest.fn(),
    processDocument: jest.fn(),
    getDocument: jest.fn(),
    createDocumentVersion: jest.fn(),
    getDocumentVersions: jest.fn(),
    deleteDocument: jest.fn(),
  },
}));

// Create minimal test app with only document routes
const createTestApp = () => {
  const app = express();
  
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Add request ID middleware
  app.use((req, res, next) => {
    req.headers['x-request-id'] = req.headers['x-request-id'] || 'test-request-id';
    next();
  });
  
  app.use('/api/documents', documentRoutes);
  app.use(errorHandler);
  
  return app;
};

describe('Document Routes - Minimal Test', () => {
  let app: express.Application;
  let authToken: string;
  
  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockProjectId = '550e8400-e29b-41d4-a716-446655440001';
  const mockDocumentId = '550e8400-e29b-41d4-a716-446655440002';

  beforeAll(() => {
    app = createTestApp();
    
    // Create a valid JWT token for testing
    authToken = jwt.sign(
      { userId: mockUserId, email: 'test@example.com', userType: 'homeowner' },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/documents/upload', () => {
    const mockDocument: Document = {
      id: mockDocumentId,
      filename: 'test-plan.pdf',
      originalName: 'test-plan.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'projects/test-project/documents/test-doc/test-plan.pdf',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      status: 'uploaded',
      version: 1,
      auditTrail: [],
    };

    it('should upload document successfully', async () => {
      (documentService.uploadDocument as jest.Mock).mockResolvedValueOnce(mockDocument);

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId)
        .attach('document', Buffer.from('mock pdf content'), 'test-plan.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: mockDocumentId,
        originalName: 'test-plan.pdf',
        status: 'uploaded',
      });

      expect(documentService.uploadDocument).toHaveBeenCalledWith(
        mockProjectId,
        mockUserId,
        expect.objectContaining({
          originalname: 'test-plan.pdf',
          mimetype: 'application/pdf',
        })
      );
    });

    it('should reject upload without authentication', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .field('projectId', mockProjectId)
        .attach('document', Buffer.from('mock pdf content'), 'test-plan.pdf');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject upload without file', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });

  describe('POST /api/documents/process', () => {
    const mockProcessingResult: DocumentProcessingResult = {
      documentId: mockDocumentId,
      extractedText: 'Floor Plan - Ground Floor\nScale: 1:100\nTotal Area: 85.5 m²',
      classification: {
        type: 'architectural-plan',
        confidence: 0.95,
        subType: 'floor-plan',
        aiAnalysis: 'This appears to be an architectural floor plan',
      },
      metadata: {
        fileType: 'architectural-plan',
        technicalSpecs: [
          {
            category: 'dimensions',
            specification: 'total area',
            value: '85.5',
            unit: 'm²',
            confidence: 0.9,
          },
        ],
        extractedData: { scale: '1:100' },
        confidence: 0.85,
      },
      success: true,
      processingTime: 5000,
    };

    it('should process document successfully', async () => {
      (documentService.processDocument as jest.Mock).mockResolvedValueOnce(mockProcessingResult);

      const response = await request(app)
        .post('/api/documents/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: mockProjectId,
          documentId: mockDocumentId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        documentId: mockDocumentId,
        success: true,
        classification: {
          type: 'architectural-plan',
          confidence: 0.95,
        },
      });

      expect(documentService.processDocument).toHaveBeenCalledWith(mockProjectId, mockDocumentId);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/documents/process')
        .send({
          projectId: mockProjectId,
          documentId: mockDocumentId,
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/documents/:projectId/:documentId', () => {
    const mockDocument: Document = {
      id: mockDocumentId,
      filename: 'test-plan.pdf',
      originalName: 'test-plan.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'projects/test-project/documents/test-doc/test-plan.pdf',
      uploadedAt: '2024-01-01T00:00:00.000Z',
      processedAt: '2024-01-01T00:05:00.000Z',
      status: 'processed',
      version: 1,
      classification: {
        type: 'architectural-plan',
        confidence: 0.95,
      },
      auditTrail: [],
    };

    it('should get document successfully', async () => {
      (documentService.getDocument as jest.Mock).mockResolvedValueOnce(mockDocument);

      const response = await request(app)
        .get(`/api/documents/${mockProjectId}/${mockDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        id: mockDocumentId,
        status: 'processed',
        classification: {
          type: 'architectural-plan',
        },
      });

      expect(documentService.getDocument).toHaveBeenCalledWith(mockProjectId, mockDocumentId);
    });

    it('should return 404 for non-existent document', async () => {
      (documentService.getDocument as jest.Mock).mockResolvedValueOnce(null);

      const response = await request(app)
        .get(`/api/documents/${mockProjectId}/${mockDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DOCUMENT_NOT_FOUND');
    });
  });

  describe('DELETE /api/documents/:projectId/:documentId', () => {
    it('should delete document successfully', async () => {
      (documentService.deleteDocument as jest.Mock).mockResolvedValueOnce(undefined);

      const response = await request(app)
        .delete(`/api/documents/${mockProjectId}/${mockDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Document archived successfully');

      expect(documentService.deleteDocument).toHaveBeenCalledWith(
        mockProjectId,
        mockDocumentId,
        mockUserId
      );
    });

    it('should handle deletion errors', async () => {
      (documentService.deleteDocument as jest.Mock).mockRejectedValueOnce(
        new Error('Document not found')
      );

      const response = await request(app)
        .delete(`/api/documents/${mockProjectId}/${mockDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('DELETE_FAILED');
    });
  });
});