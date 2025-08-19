import { DocumentService } from '../../services/DocumentService';
import { s3Client, textractClient, bedrockClient, dynamoDBDocClient } from '../../config/aws';
import { Document, DocumentProcessingResult } from '../../types';

// Mock AWS clients
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

describe('DocumentService', () => {
  let documentService: DocumentService;
  const mockProjectId = 'test-project-123';
  const mockUserId = 'test-user-456';
  const mockDocumentId = 'test-doc-789';

  beforeEach(() => {
    documentService = new DocumentService();
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'document',
      originalname: 'test-plan.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024000,
      buffer: Buffer.from('mock file content'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    it('should upload document successfully', async () => {
      // Mock S3 upload success
      (s3Client.send as jest.Mock).mockResolvedValueOnce({});
      
      // Mock DynamoDB put success
      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({});

      const result = await documentService.uploadDocument(mockProjectId, mockUserId, mockFile);

      expect(result).toMatchObject({
        originalName: 'test-plan.pdf',
        mimeType: 'application/pdf',
        size: 1024000,
        status: 'uploaded',
        version: 1,
      });

      expect(s3Client.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Bucket: expect.any(String),
            ContentType: 'application/pdf',
            ServerSideEncryption: 'AES256',
          }),
        })
      );

      expect(dynamoDBDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              PK: `PROJECT#${mockProjectId}`,
              SK: expect.stringMatching(/^DOCUMENT#/),
              status: 'uploaded',
            }),
          }),
        })
      );
    });

    it('should handle S3 upload failure', async () => {
      (s3Client.send as jest.Mock).mockRejectedValueOnce(new Error('S3 upload failed'));

      await expect(
        documentService.uploadDocument(mockProjectId, mockUserId, mockFile)
      ).rejects.toThrow('Failed to upload document');
    });

    it('should handle DynamoDB put failure', async () => {
      (s3Client.send as jest.Mock).mockResolvedValueOnce({});
      (dynamoDBDocClient.send as jest.Mock).mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(
        documentService.uploadDocument(mockProjectId, mockUserId, mockFile)
      ).rejects.toThrow('Failed to upload document');
    });
  });

  describe('processDocument', () => {
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

    it('should process document successfully', async () => {
      // Mock get document
      (dynamoDBDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Item: mockDocument }) // getDocument
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentProcessingResults

      // Mock Textract response
      (textractClient.send as jest.Mock).mockResolvedValueOnce({
        Blocks: [
          {
            BlockType: 'LINE',
            Text: 'Floor Plan - Ground Floor',
          },
          {
            BlockType: 'LINE',
            Text: 'Scale: 1:100',
          },
          {
            BlockType: 'LINE',
            Text: 'Total Area: 85.5 m²',
          },
        ],
      });

      // Mock Bedrock classification response
      (bedrockClient.send as jest.Mock)
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: `{
                "type": "architectural-plan",
                "confidence": 0.95,
                "subType": "floor-plan",
                "aiAnalysis": "This appears to be an architectural floor plan with scale and area measurements"
              }`
            }]
          }))
        })
        // Mock technical specs extraction response
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{
              text: `{
                "fileType": "architectural-plan",
                "technicalSpecs": [
                  {
                    "category": "dimensions",
                    "specification": "total area",
                    "value": "85.5",
                    "unit": "m²",
                    "confidence": 0.9
                  }
                ],
                "extractedData": {
                  "scale": "1:100",
                  "floorType": "ground floor"
                },
                "confidence": 0.85
              }`
            }]
          }))
        });

      const result = await documentService.processDocument(mockProjectId, mockDocumentId);

      expect(result.success).toBe(true);
      expect(result.documentId).toBe(mockDocumentId);
      expect(result.extractedText).toContain('Floor Plan - Ground Floor');
      expect(result.classification?.type).toBe('architectural-plan');
      expect(result.metadata?.technicalSpecs).toHaveLength(1);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle document not found', async () => {
      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

      const result = await documentService.processDocument(mockProjectId, mockDocumentId);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Document not found');
    });

    it('should handle Textract failure', async () => {
      (dynamoDBDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Item: mockDocument })
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentStatus (failed)

      (textractClient.send as jest.Mock).mockRejectedValueOnce(new Error('Textract failed'));

      const result = await documentService.processDocument(mockProjectId, mockDocumentId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to extract text');
    });

    it('should handle Bedrock classification failure gracefully', async () => {
      (dynamoDBDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Item: mockDocument })
        .mockResolvedValueOnce({}) // updateDocumentStatus (processing)
        .mockResolvedValueOnce({}); // updateDocumentProcessingResults

      (textractClient.send as jest.Mock).mockResolvedValueOnce({
        Blocks: [{ BlockType: 'LINE', Text: 'Some text' }],
      });

      // Mock Bedrock failure for classification
      (bedrockClient.send as jest.Mock)
        .mockRejectedValueOnce(new Error('Bedrock unavailable'))
        // Mock success for technical specs
        .mockResolvedValueOnce({
          body: new TextEncoder().encode(JSON.stringify({
            content: [{ text: '{"fileType": "other", "technicalSpecs": [], "confidence": 0.3}' }]
          }))
        });

      const result = await documentService.processDocument(mockProjectId, mockDocumentId);

      expect(result.success).toBe(true);
      expect(result.classification?.type).toBe('other'); // Fallback classification
      expect(result.classification?.confidence).toBeLessThan(0.8);
    });
  });

  describe('createDocumentVersion', () => {
    const mockFile: Express.Multer.File = {
      fieldname: 'document',
      originalname: 'test-plan-v2.pdf',
      encoding: '7bit',
      mimetype: 'application/pdf',
      size: 1024000,
      buffer: Buffer.from('mock file content v2'),
      destination: '',
      filename: '',
      path: '',
      stream: {} as any,
    };

    const mockOriginalDocument: Document = {
      id: 'original-doc-id',
      filename: 'test-plan.pdf',
      originalName: 'test-plan.pdf',
      mimeType: 'application/pdf',
      size: 1024000,
      s3Key: 'projects/test-project/documents/original-doc/test-plan.pdf',
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

    it('should create document version successfully', async () => {
      // Mock get original document
      (dynamoDBDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Item: mockOriginalDocument }) // getDocument (original)
        .mockResolvedValueOnce({}) // uploadDocument - DynamoDB put
        .mockResolvedValueOnce({}); // updateDocumentVersion

      (s3Client.send as jest.Mock).mockResolvedValueOnce({}); // S3 upload

      const result = await documentService.createDocumentVersion(
        mockProjectId,
        'original-doc-id',
        mockUserId,
        mockFile
      );

      expect(result.version).toBe(2);
      expect(result.auditTrail).toHaveLength(2);
      expect(result.auditTrail[1].action).toBe('uploaded');
      expect(result.auditTrail[1].details?.previousVersion).toBe(1);
    });

    it('should handle original document not found', async () => {
      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

      await expect(
        documentService.createDocumentVersion(mockProjectId, 'non-existent', mockUserId, mockFile)
      ).rejects.toThrow('Original document not found');
    });
  });

  describe('deleteDocument', () => {
    const mockDocument: Document = {
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
    };

    it('should archive document successfully', async () => {
      (dynamoDBDocClient.send as jest.Mock)
        .mockResolvedValueOnce({ Item: mockDocument }) // getDocument
        .mockResolvedValueOnce({}); // updateDocument (archive)

      (s3Client.send as jest.Mock)
        .mockResolvedValueOnce({}) // copy to archive
        .mockResolvedValueOnce({}); // delete original

      await documentService.deleteDocument(mockProjectId, mockDocumentId, mockUserId);

      expect(s3Client.send).toHaveBeenCalledTimes(2);
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

    it('should handle document not found', async () => {
      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

      await expect(
        documentService.deleteDocument(mockProjectId, mockDocumentId, mockUserId)
      ).rejects.toThrow('Document not found');
    });
  });

  describe('getDocument', () => {
    it('should retrieve document successfully', async () => {
      const mockDocument: Document = {
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
      };

      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({ Item: mockDocument });

      const result = await documentService.getDocument(mockProjectId, mockDocumentId);

      expect(result).toEqual(mockDocument);
      expect(dynamoDBDocClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: {
              PK: `PROJECT#${mockProjectId}`,
              SK: `DOCUMENT#${mockDocumentId}`,
            },
          }),
        })
      );
    });

    it('should return null for non-existent document', async () => {
      (dynamoDBDocClient.send as jest.Mock).mockResolvedValueOnce({ Item: null });

      const result = await documentService.getDocument(mockProjectId, mockDocumentId);

      expect(result).toBeNull();
    });

    it('should handle DynamoDB error gracefully', async () => {
      (dynamoDBDocClient.send as jest.Mock).mockRejectedValueOnce(new Error('DynamoDB error'));

      const result = await documentService.getDocument(mockProjectId, mockDocumentId);

      expect(result).toBeNull();
    });
  });
});