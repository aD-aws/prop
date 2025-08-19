/**
 * Integration test for document upload and AI processing workflow
 * This test verifies the complete document processing pipeline
 */

import { DocumentService } from '../../services/DocumentService';
import { Document, DocumentProcessingResult } from '../../types';

// Mock AWS services for integration testing
jest.mock('../../config/aws', () => ({
  s3Client: {
    send: jest.fn(),
  },
  textractClient: {
    send: jest.fn(),
  },
  bedrockClient: {
    send: jest.fn(),
  },
  dynamoDBDocClient: {
    send: jest.fn(),
  },
  TABLE_NAME: 'test-table',
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Document Upload and AI Processing Workflow', () => {
  let documentService: DocumentService;
  const mockProjectId = 'test-project-123';
  const mockUserId = 'test-user-456';

  beforeEach(() => {
    documentService = new DocumentService();
    jest.clearAllMocks();
  });

  describe('Complete Document Processing Workflow', () => {
    it('should handle complete document upload and processing workflow', async () => {
      const { s3Client, textractClient, bedrockClient, dynamoDBDocClient } = require('../../config/aws');

      // Mock file
      const mockFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'structural-plan.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 2048000,
        buffer: Buffer.from('mock structural plan content'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      };

      // Step 1: Upload Document
      s3Client.send.mockResolvedValueOnce({}); // S3 upload
      dynamoDBDocClient.send.mockResolvedValueOnce({}); // DynamoDB put

      const uploadedDocument = await documentService.uploadDocument(
        mockProjectId,
        mockUserId,
        mockFile
      );

      expect(uploadedDocument).toMatchObject({
        originalName: 'structural-plan.pdf',
        mimeType: 'application/pdf',
        size: 2048000,
        status: 'uploaded',
        version: 1,
      });

      // Step 2: Process Document with AI
      const mockDocument: Document = {
        ...uploadedDocument,
        id: 'test-doc-id',
      };

      // Mock get document for processing
      dynamoDBDocClient.send
        .mockResolvedValueOnce({ Item: mockDocument }) // getDocument
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentProcessingResults

      // Mock Textract OCR
      textractClient.send.mockResolvedValueOnce({
        Blocks: [
          {
            BlockType: 'LINE',
            Text: 'STRUCTURAL ENGINEERING DRAWING',
          },
          {
            BlockType: 'LINE',
            Text: 'Foundation Plan - Ground Floor',
          },
          {
            BlockType: 'LINE',
            Text: 'Load Bearing Wall: 150mm Concrete Block',
          },
          {
            BlockType: 'LINE',
            Text: 'Steel Beam: 203x133x25 UC',
          },
          {
            BlockType: 'LINE',
            Text: 'Safe Working Load: 15kN/m²',
          },
        ],
      });

      // Mock Bedrock AI classification
      bedrockClient.send
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: `{
                "type": "structural-drawing",
                "confidence": 0.92,
                "subType": "foundation-plan",
                "aiAnalysis": "This is a structural engineering drawing showing foundation plans with load-bearing elements and steel beam specifications"
              }`
            }]
          }))
        })
        // Mock technical specs extraction
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: `{
                "fileType": "structural-drawing",
                "technicalSpecs": [
                  {
                    "category": "structural",
                    "specification": "steel beam",
                    "value": "203x133x25 UC",
                    "unit": "mm",
                    "confidence": 0.95
                  },
                  {
                    "category": "loading",
                    "specification": "safe working load",
                    "value": "15",
                    "unit": "kN/m²",
                    "confidence": 0.88
                  },
                  {
                    "category": "materials",
                    "specification": "wall construction",
                    "value": "150mm Concrete Block",
                    "unit": "mm",
                    "confidence": 0.90
                  }
                ],
                "extractedData": {
                  "drawingType": "foundation plan",
                  "floor": "ground floor",
                  "materials": ["concrete block", "steel beam"],
                  "standards": ["UK Building Regulations"]
                },
                "confidence": 0.89
              }`
            }]
          }))
        });

      const processingResult = await documentService.processDocument(
        mockProjectId,
        mockDocument.id
      );

      // Verify processing results
      expect(processingResult.success).toBe(true);
      expect(processingResult.documentId).toBe(mockDocument.id);
      expect(processingResult.extractedText).toContain('STRUCTURAL ENGINEERING DRAWING');
      expect(processingResult.extractedText).toContain('Steel Beam: 203x133x25 UC');
      
      expect(processingResult.classification).toMatchObject({
        type: 'structural-drawing',
        confidence: 0.92,
        subType: 'foundation-plan',
      });

      expect(processingResult.metadata?.technicalSpecs).toHaveLength(3);
      expect(processingResult.metadata?.technicalSpecs?.[0]).toMatchObject({
        category: 'structural',
        specification: 'steel beam',
        value: '203x133x25 UC',
        confidence: 0.95,
      });

      expect(processingResult.metadata?.extractedData).toMatchObject({
        drawingType: 'foundation plan',
        materials: ['concrete block', 'steel beam'],
      });

      // Verify AWS service calls
      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            ContentType: 'application/pdf',
            ServerSideEncryption: 'AES256',
          }),
        })
      );

      expect(textractClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Document: expect.objectContaining({
              S3Object: expect.objectContaining({
                Bucket: expect.any(String),
                Name: expect.any(String),
              }),
            }),
          }),
        })
      );

      expect(bedrockClient.send).toHaveBeenCalledTimes(2); // Classification + technical specs
      expect(dynamoDBDocClient.send).toHaveBeenCalledTimes(4); // Upload + get + status update + processing results
    });

    it('should handle document versioning workflow', async () => {
      const { s3Client, dynamoDBDocClient } = require('../../config/aws');

      const originalDocument: Document = {
        id: 'original-doc-id',
        filename: 'plan-v1.pdf',
        originalName: 'plan-v1.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        s3Key: 'projects/test-project/documents/original/plan-v1.pdf',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        status: 'processed',
        version: 1,
        auditTrail: [{
          action: 'uploaded',
          timestamp: '2024-01-01T00:00:00.000Z',
          userId: mockUserId,
          details: {}
        }],
      };

      const newVersionFile: Express.Multer.File = {
        fieldname: 'document',
        originalname: 'plan-v2.pdf',
        encoding: '7bit',
        mimetype: 'application/pdf',
        size: 1536000,
        buffer: Buffer.from('updated plan content'),
        destination: '',
        filename: '',
        path: '',
        stream: {} as any,
      };

      // Mock get original document
      dynamoDBDocClient.send
        .mockResolvedValueOnce({ Item: originalDocument }) // getDocument (original)
        .mockResolvedValueOnce({}) // uploadDocument - DynamoDB put
        .mockResolvedValueOnce({}); // updateDocumentVersion

      s3Client.send.mockResolvedValueOnce({}); // S3 upload

      const versionedDocument = await documentService.createDocumentVersion(
        mockProjectId,
        'original-doc-id',
        mockUserId,
        newVersionFile
      );

      expect(versionedDocument.version).toBe(2);
      expect(versionedDocument.originalName).toBe('plan-v2.pdf');
      expect(versionedDocument.auditTrail).toHaveLength(2);
      expect(versionedDocument.auditTrail[1]).toMatchObject({
        action: 'uploaded',
        userId: mockUserId,
        details: {
          previousVersion: 1,
          originalName: 'plan-v2.pdf'
        }
      });
    });

    it('should handle document archival workflow', async () => {
      const { s3Client, dynamoDBDocClient } = require('../../config/aws');

      const documentToArchive: Document = {
        id: 'doc-to-archive',
        filename: 'old-plan.pdf',
        originalName: 'old-plan.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        s3Key: 'projects/test-project/documents/doc-to-archive/old-plan.pdf',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        status: 'processed',
        version: 1,
        auditTrail: [],
      };

      // Mock get document and S3 operations
      dynamoDBDocClient.send
        .mockResolvedValueOnce({ Item: documentToArchive }) // getDocument
        .mockResolvedValueOnce({}); // updateDocument (archive)

      s3Client.send
        .mockResolvedValueOnce({}) // copy to archive
        .mockResolvedValueOnce({}); // delete original

      await documentService.deleteDocument(mockProjectId, 'doc-to-archive', mockUserId);

      // Verify S3 operations
      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: expect.stringContaining('archived-documents/'),
            CopySource: expect.stringContaining('projects/test-project/documents/'),
          }),
        })
      );

      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            Key: documentToArchive.s3Key,
          }),
        })
      );

      // Verify database update
      expect(dynamoDBDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            UpdateExpression: expect.stringContaining('#status = :status'),
            ExpressionAttributeValues: expect.objectContaining({
              ':status': 'archived',
            }),
          }),
        })
      );
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle Textract service failures gracefully', async () => {
      const { textractClient, dynamoDBDocClient } = require('../../config/aws');

      const mockDocument: Document = {
        id: 'test-doc-id',
        filename: 'test.pdf',
        originalName: 'test.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        s3Key: 'projects/test/documents/test.pdf',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        status: 'uploaded',
        version: 1,
        auditTrail: [],
      };

      dynamoDBDocClient.send
        .mockResolvedValueOnce({ Item: mockDocument }) // getDocument
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentStatus (failed)

      textractClient.send.mockRejectedValueOnce(new Error('Textract service unavailable'));

      const result = await documentService.processDocument(mockProjectId, 'test-doc-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract text');
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle Bedrock service failures with fallback classification', async () => {
      const { textractClient, bedrockClient, dynamoDBDocClient } = require('../../config/aws');

      const mockDocument: Document = {
        id: 'test-doc-id',
        filename: 'image.jpg',
        originalName: 'site-photo.jpg',
        mimeType: 'image/jpeg',
        size: 512000,
        s3Key: 'projects/test/documents/image.jpg',
        uploadedAt: '2024-01-01T00:00:00.000Z',
        status: 'uploaded',
        version: 1,
        auditTrail: [],
      };

      dynamoDBDocClient.send
        .mockResolvedValueOnce({ Item: mockDocument }) // getDocument
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentProcessingResults

      textractClient.send.mockResolvedValueOnce({
        Blocks: [{ BlockType: 'LINE', Text: 'Construction site photo' }],
      });

      // Mock Bedrock failures
      bedrockClient.send
        .mockRejectedValueOnce(new Error('Bedrock unavailable')) // Classification failure
        .mockResolvedValueOnce({ // Technical specs success
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '{"fileType": "photograph", "technicalSpecs": [], "confidence": 0.5}' }]
          }))
        });

      const result = await documentService.processDocument(mockProjectId, 'test-doc-id');

      expect(result.success).toBe(true);
      expect(result.classification?.type).toBe('photograph'); // Fallback based on MIME type
      expect(result.classification?.confidence).toBe(0.7);
      expect(result.classification?.aiAnalysis).toContain('based on MIME type');
    });
  });
});