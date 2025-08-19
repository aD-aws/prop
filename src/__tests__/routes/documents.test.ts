import request from 'supertest';
import app from '../../app';
import { documentService } from '../../services/DocumentService';
import { Document, DocumentProcessingResult } from '../../types';
import jwt from 'jsonwebtoken';
import { config } from '../../config';

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

describe('Document Routes', () => {
  const mockUserId = 'test-user-123';
  const mockProjectId = 'test-project-456';
  const mockDocumentId = 'test-doc-789';
  
  let authToken: string;

  beforeAll(() => {
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

    it('should reject unsupported file types', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId)
        .attach('document', Buffer.from('mock content'), {
          filename: 'test.txt',
          contentType: 'text/plain',
        });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should handle service errors', async () => {
      (documentService.uploadDocument as jest.Mock).mockRejectedValueOnce(
        new Error('S3 upload failed')
      );

      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId)
        .attach('document', Buffer.from('mock pdf content'), 'test-plan.pdf');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPLOAD_FAILED');
    });

    it('should validate projectId format', async () => {
      const response = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', 'invalid-uuid')
        .attach('document', Buffer.from('mock pdf content'), 'test-plan.pdf');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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

    it('should handle processing failure', async () => {
      const failedResult: DocumentProcessingResult = {
        documentId: mockDocumentId,
        success: false,
        error: 'Textract service unavailable',
        processingTime: 1000,
      };

      (documentService.processDocument as jest.Mock).mockResolvedValueOnce(failedResult);

      const response = await request(app)
        .post('/api/documents/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: mockProjectId,
          documentId: mockDocumentId,
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.success).toBe(false);
      expect(response.body.data.error).toBe('Textract service unavailable');
    });

    it('should validate request parameters', async () => {
      const response = await request(app)
        .post('/api/documents/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          projectId: 'invalid-uuid',
          documentId: mockDocumentId,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
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

    it('should validate UUID parameters', async () => {
      const response = await request(app)
        .get(`/api/documents/invalid-uuid/${mockDocumentId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/documents/version', () => {
    const mockVersionedDocument: Document = {
      id: 'new-version-id',
      filename: 'test-plan-v2.pdf',
      originalName: 'test-plan-v2.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'projects/test-project/documents/new-version/test-plan-v2.pdf',
      uploadedAt: '2024-01-01T01:00:00.000Z',
      status: 'uploaded',
      version: 2,
      auditTrail: [
        {
          action: 'uploaded',
          timestamp: '2024-01-01T00:00:00.000Z',
          userId: mockUserId,
          details: {},
        },
        {
          action: 'uploaded',
          timestamp: '2024-01-01T01:00:00.000Z',
          userId: mockUserId,
          details: { previousVersion: 1 },
        },
      ],
    };

    it('should create document version successfully', async () => {
      (documentService.createDocumentVersion as jest.Mock).mockResolvedValueOnce(mockVersionedDocument);

      const response = await request(app)
        .post('/api/documents/version')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId)
        .field('originalDocumentId', mockDocumentId)
        .attach('document', Buffer.from('mock pdf content v2'), 'test-plan-v2.pdf');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.version).toBe(2);
      expect(response.body.data.auditTrail).toHaveLength(2);

      expect(documentService.createDocumentVersion).toHaveBeenCalledWith(
        mockProjectId,
        mockDocumentId,
        mockUserId,
        expect.objectContaining({
          originalname: 'test-plan-v2.pdf',
        })
      );
    });

    it('should require file for version creation', async () => {
      const response = await request(app)
        .post('/api/documents/version')
        .set('Authorization', `Bearer ${authToken}`)
        .field('projectId', mockProjectId)
        .field('originalDocumentId', mockDocumentId);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_FILE');
    });
  });

  describe('GET /api/documents/:projectId/:documentId/versions', () => {
    const mockVersions: Document[] = [
      {
        id: mockDocumentId,
        filename: 'test-plan.pdf',
        originalName: 'test-plan.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        s3Key: 'projects/test-project/documents/test-doc/test-plan.pdf',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        status: 'processed',
        version: 1,
        auditTrail: [],
      },
      {
        id: 'version-2-id',
        filename: 'test-plan-v2.pdf',
        originalName: 'test-plan-v2.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        s3Key: 'projects/test-project/documents/version-2/test-plan-v2.pdf',
        uploadedAt: '2024-01-01T01:00:00.000Z',
        status: 'processed',
        version: 2,
        auditTrail: [],
      },
    ];

    it('should get document versions successfully', async () => {
      (documentService.getDocumentVersions as jest.Mock).mockResolvedValueOnce(mockVersions);

      const response = await request(app)
        .get(`/api/documents/${mockProjectId}/${mockDocumentId}/versions`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].version).toBe(1);
      expect(response.body.data[1].version).toBe(2);
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