import { v4 as uuidv4 } from 'uuid';
import { 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand 
} from '@aws-sdk/client-s3';
import { 
  DetectDocumentTextCommand,
  AnalyzeDocumentCommand,
  FeatureType 
} from '@aws-sdk/client-textract';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { s3Client, textractClient, bedrockClient, dynamoDBDocClient, TABLE_NAME } from '../config/aws';
import { config } from '../config';
import { 
  Document, 
  DocumentProcessingResult, 
  DocumentClassification, 
  DocumentMetadata,
  TechnicalSpecification,
  DocumentAuditEntry,
  DocumentType
} from '../types';
import { logger } from '../utils/logger';

export class DocumentService {
  private readonly bucketName = config.s3.bucketName;
  private readonly bedrockModelId = config.bedrock.modelId;

  /**
   * Upload a document to S3 with encryption and create database record
   */
  async uploadDocument(
    projectId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<Document> {
    const documentId = uuidv4();
    const timestamp = new Date().toISOString();
    const s3Key = `projects/${projectId}/documents/${documentId}/${file.originalname}`;

    try {
      // Upload to S3 with server-side encryption
      const uploadCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ServerSideEncryption: 'AES256',
        Metadata: {
          projectId,
          userId,
          originalName: file.originalname,
          uploadedAt: timestamp,
        },
      });

      await s3Client.send(uploadCommand);

      // Create document record
      const document: Document = {
        id: documentId,
        filename: `${documentId}_${file.originalname}`,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        s3Key,
        uploadedAt: timestamp,
        version: 1,
        status: 'uploaded',
        auditTrail: [{
          action: 'uploaded',
          timestamp,
          userId,
          details: { originalName: file.originalname, size: file.size }
        }]
      };

      // Store in DynamoDB
      await dynamoDBDocClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `PROJECT#${projectId}`,
          SK: `DOCUMENT#${documentId}`,
          ...document,
          GSI1PK: `DOCUMENT#${documentId}`,
          GSI1SK: document.status,
        }
      }));

      logger.info(`Document uploaded successfully: ${documentId}`, { projectId, userId });
      return document;

    } catch (error) {
      logger.error('Failed to upload document', { error, projectId, userId });
      throw new Error('Failed to upload document');
    }
  }

  /**
   * Process document using AWS Textract and Bedrock for AI analysis
   */
  async processDocument(projectId: string, documentId: string): Promise<DocumentProcessingResult> {
    const startTime = Date.now();
    
    try {
      // Get document record
      const document = await this.getDocument(projectId, documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Update status to processing
      await this.updateDocumentStatus(projectId, documentId, 'processing');

      // Extract text using Textract
      const extractedText = await this.extractTextFromDocument(document.s3Key);
      
      // Classify document using Bedrock
      const classification = await this.classifyDocument(extractedText, document.mimeType);
      
      // Extract technical specifications using Bedrock
      const metadata = await this.extractTechnicalSpecs(extractedText, classification.type);
      
      const processingTime = Date.now() - startTime;
      const processedAt = new Date().toISOString();

      // Update document with processing results
      await this.updateDocumentProcessingResults(
        projectId, 
        documentId, 
        extractedText, 
        classification, 
        metadata, 
        processedAt
      );

      const result: DocumentProcessingResult = {
        documentId,
        extractedText,
        classification,
        metadata,
        success: true,
        processingTime
      };

      logger.info(`Document processed successfully: ${documentId}`, { 
        projectId, 
        processingTime,
        classification: classification.type 
      });

      return result;

    } catch (error) {
      logger.error('Failed to process document', { error, projectId, documentId });
      
      // Update status to failed
      await this.updateDocumentStatus(projectId, documentId, 'failed');
      
      return {
        documentId,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Extract text from document using AWS Textract
   */
  private async extractTextFromDocument(s3Key: string): Promise<string> {
    try {
      const command = new DetectDocumentTextCommand({
        Document: {
          S3Object: {
            Bucket: this.bucketName,
            Name: s3Key,
          },
        },
      });

      const response = await textractClient.send(command);
      
      if (!response.Blocks) {
        return '';
      }

      // Extract text from LINE blocks
      const textBlocks = response.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .filter(text => text)
        .join('\n');

      return textBlocks;

    } catch (error) {
      logger.error('Textract extraction failed', { error, s3Key });
      throw new Error('Failed to extract text from document');
    }
  }

  /**
   * Classify document using Bedrock AI
   */
  private async classifyDocument(extractedText: string, mimeType: string): Promise<DocumentClassification> {
    const prompt = `
You are an expert in UK construction and building documentation. Analyze the following document content and classify it.

Document MIME type: ${mimeType}
Document content:
${extractedText.substring(0, 2000)}...

Please classify this document into one of these categories:
- structural-drawing: Technical drawings showing structural elements, beams, foundations, etc.
- architectural-plan: Floor plans, elevations, sections, site plans
- structural-calculation: Engineering calculations, load calculations, structural analysis
- building-regulation-document: Building control applications, compliance certificates
- planning-application: Planning permission documents, design and access statements
- survey-report: Building surveys, condition reports, structural surveys
- specification-document: Technical specifications, material schedules, work descriptions
- photograph: Site photos, progress photos, reference images
- other: Any other construction-related document

Respond with a JSON object containing:
{
  "type": "document-type",
  "confidence": 0.95,
  "subType": "specific-subtype-if-applicable",
  "aiAnalysis": "Brief explanation of classification reasoning"
}
`;

    try {
      const command = new InvokeModelCommand({
        modelId: this.bedrockModelId,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: prompt
          }]
        }),
        contentType: "application/json",
        accept: "application/json"
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      // Parse the AI response
      const aiResponse = responseBody.content[0].text;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const classification = JSON.parse(jsonMatch[0]);
        return {
          type: classification.type as DocumentType,
          confidence: classification.confidence || 0.8,
          subType: classification.subType,
          aiAnalysis: classification.aiAnalysis
        };
      }

      // Fallback classification based on MIME type
      return this.getFallbackClassification(mimeType);

    } catch (error) {
      logger.error('Document classification failed', { error });
      return this.getFallbackClassification(mimeType);
    }
  }

  /**
   * Extract technical specifications using Bedrock AI
   */
  private async extractTechnicalSpecs(extractedText: string, documentType: DocumentType): Promise<DocumentMetadata> {
    const prompt = `
You are an expert in UK construction standards and building regulations. Extract technical specifications from this ${documentType} document.

Document content:
${extractedText.substring(0, 3000)}...

Extract the following information where available:
- Dimensions (length, width, height, area)
- Materials specified
- Load calculations or structural requirements
- Building regulation references
- British Standards (BS) references
- Compliance requirements
- Technical parameters with units

Respond with a JSON object containing:
{
  "fileType": "${documentType}",
  "technicalSpecs": [
    {
      "category": "dimensions",
      "specification": "floor area",
      "value": "25.5",
      "unit": "m²",
      "confidence": 0.9
    }
  ],
  "extractedData": {
    "materials": [],
    "standards": [],
    "regulations": [],
    "calculations": []
  },
  "confidence": 0.85
}
`;

    try {
      const command = new InvokeModelCommand({
        modelId: this.bedrockModelId,
        body: JSON.stringify({
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 2000,
          messages: [{
            role: "user",
            content: prompt
          }]
        }),
        contentType: "application/json",
        accept: "application/json"
      });

      const response = await bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      const aiResponse = responseBody.content[0].text;
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const metadata = JSON.parse(jsonMatch[0]);
        return {
          fileType: documentType,
          technicalSpecs: metadata.technicalSpecs || [],
          extractedData: metadata.extractedData || {},
          confidence: metadata.confidence || 0.7
        };
      }

      return {
        fileType: documentType,
        technicalSpecs: [],
        extractedData: {},
        confidence: 0.5
      };

    } catch (error) {
      logger.error('Technical specification extraction failed', { error });
      return {
        fileType: documentType,
        technicalSpecs: [],
        extractedData: {},
        confidence: 0.3
      };
    }
  }

  /**
   * Get fallback classification based on MIME type
   */
  private getFallbackClassification(mimeType: string): DocumentClassification {
    if (mimeType.startsWith('image/')) {
      return {
        type: 'photograph',
        confidence: 0.7,
        aiAnalysis: 'Classified as photograph based on MIME type'
      };
    }
    
    return {
      type: 'other',
      confidence: 0.5,
      aiAnalysis: 'Unable to classify document automatically'
    };
  }

  /**
   * Get document by ID
   */
  async getDocument(projectId: string, documentId: string): Promise<Document | null> {
    try {
      const response = await dynamoDBDocClient.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `DOCUMENT#${documentId}`
        }
      }));

      return response.Item as Document || null;
    } catch (error) {
      logger.error('Failed to get document', { error, projectId, documentId });
      return null;
    }
  }

  /**
   * Update document status
   */
  private async updateDocumentStatus(projectId: string, documentId: string, status: Document['status']): Promise<void> {
    const timestamp = new Date().toISOString();
    
    await dynamoDBDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROJECT#${projectId}`,
        SK: `DOCUMENT#${documentId}`
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :timestamp, GSI1SK = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':timestamp': timestamp
      }
    }));
  }

  /**
   * Update document with processing results
   */
  private async updateDocumentProcessingResults(
    projectId: string,
    documentId: string,
    extractedText: string,
    classification: DocumentClassification,
    metadata: DocumentMetadata,
    processedAt: string
  ): Promise<void> {
    await dynamoDBDocClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `PROJECT#${projectId}`,
        SK: `DOCUMENT#${documentId}`
      },
      UpdateExpression: `
        SET 
          #status = :status,
          processedAt = :processedAt,
          extractedText = :extractedText,
          classification = :classification,
          metadata = :metadata,
          updatedAt = :timestamp,
          GSI1SK = :status
      `,
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'processed',
        ':processedAt': processedAt,
        ':extractedText': extractedText,
        ':classification': classification,
        ':metadata': metadata,
        ':timestamp': processedAt
      }
    }));
  }

  /**
   * Create new document version
   */
  async createDocumentVersion(
    projectId: string,
    originalDocumentId: string,
    userId: string,
    file: Express.Multer.File
  ): Promise<Document> {
    try {
      // Get original document
      const originalDoc = await this.getDocument(projectId, originalDocumentId);
      if (!originalDoc) {
        throw new Error('Original document not found');
      }

      // Upload new version
      const newDocument = await this.uploadDocument(projectId, userId, file);
      
      // Update version number
      const updatedDocument = {
        ...newDocument,
        version: originalDoc.version + 1,
        auditTrail: [
          ...originalDoc.auditTrail,
          {
            action: 'uploaded' as const,
            timestamp: newDocument.uploadedAt,
            userId,
            details: { 
              previousVersion: originalDoc.version,
              originalName: file.originalname 
            }
          }
        ]
      };

      // Update in database
      await dynamoDBDocClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `DOCUMENT#${newDocument.id}`
        },
        UpdateExpression: 'SET version = :version, auditTrail = :auditTrail',
        ExpressionAttributeValues: {
          ':version': updatedDocument.version,
          ':auditTrail': updatedDocument.auditTrail
        }
      }));

      return updatedDocument;

    } catch (error) {
      logger.error('Failed to create document version', { error, projectId, originalDocumentId });
      throw new Error('Failed to create document version');
    }
  }

  /**
   * Get document versions
   */
  async getDocumentVersions(projectId: string, documentId: string): Promise<Document[]> {
    // This would require additional GSI or query pattern
    // For now, return single document
    const document = await this.getDocument(projectId, documentId);
    return document ? [document] : [];
  }

  /**
   * Delete document (archive)
   */
  async deleteDocument(projectId: string, documentId: string, userId: string): Promise<void> {
    try {
      const document = await this.getDocument(projectId, documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Archive in S3 (move to archive folder)
      const archiveKey = document.s3Key.replace('documents/', 'archived-documents/');
      
      // Copy to archive location
      await s3Client.send(new CopyObjectCommand({
        Bucket: this.bucketName,
        Key: archiveKey,
        CopySource: `${this.bucketName}/${document.s3Key}`,
        ServerSideEncryption: 'AES256',
      }));

      // Delete original
      await s3Client.send(new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: document.s3Key,
      }));

      // Update document status to archived
      const timestamp = new Date().toISOString();
      await dynamoDBDocClient.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `DOCUMENT#${documentId}`
        },
        UpdateExpression: `
          SET 
            #status = :status,
            s3Key = :archiveKey,
            updatedAt = :timestamp,
            auditTrail = list_append(auditTrail, :auditEntry),
            GSI1SK = :status
        `,
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'archived',
          ':archiveKey': archiveKey,
          ':timestamp': timestamp,
          ':auditEntry': [{
            action: 'archived',
            timestamp,
            userId,
            details: { reason: 'User requested deletion' }
          }]
        }
      }));

      logger.info(`Document archived successfully: ${documentId}`, { projectId, userId });

    } catch (error) {
      logger.error('Failed to delete document', { error, projectId, documentId });
      throw new Error('Failed to delete document');
    }
  }
}

export const documentService = new DocumentService();