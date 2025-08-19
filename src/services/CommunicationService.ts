import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Message } from '../models/Notification';
import { logger } from '../utils/logger';
import { NotificationService } from './NotificationService';

export interface SendMessageData {
  projectId: string;
  senderId: string;
  recipientId: string;
  subject?: string;
  content: string;
  attachments?: Array<{
    filename: string;
    url: string;
    size: number;
  }>;
}

export class CommunicationService {
  private dynamoClient: DynamoDBDocumentClient;
  private notificationService: NotificationService;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.notificationService = new NotificationService();
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform';
  }

  async sendMessage(data: SendMessageData): Promise<Message> {
    try {
      // Validate that sender and recipient are part of the project
      await this.validateProjectAccess(data.projectId, data.senderId);
      await this.validateProjectAccess(data.projectId, data.recipientId);

      // Create message
      const message = await this.createMessage(data);

      // Send notification to recipient
      await this.notifyNewMessage(message);

      logger.info(`Message sent from ${data.senderId} to ${data.recipientId} for project ${data.projectId}`);
      return message;
    } catch (error) {
      logger.error('Failed to send message:', error);
      throw error;
    }
  }

  private async createMessage(data: SendMessageData): Promise<Message> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const message: Message = {
      PK: `PROJECT#${data.projectId}`,
      SK: `MESSAGE#${id}`,
      id,
      projectId: data.projectId,
      senderId: data.senderId,
      recipientId: data.recipientId,
      subject: data.subject,
      content: data.content,
      attachments: data.attachments,
      isRead: false,
      createdAt: now,
      GSI3PK: data.recipientId,
      GSI3SK: now
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: message
    }));

    return message;
  }

  async getProjectMessages(projectId: string, userId: string, limit: number = 50, lastKey?: string): Promise<{
    messages: Message[];
    lastKey?: string;
  }> {
    try {
      // Validate user access to project
      await this.validateProjectAccess(projectId, userId);

      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `PROJECT#${projectId}`,
          ':sk': 'MESSAGE#'
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined
      });

      const result = await this.dynamoClient.send(command);
      
      return {
        messages: result.Items as Message[] || [],
        lastKey: result.LastEvaluatedKey ? 
          Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
          undefined
      };
    } catch (error) {
      logger.error('Failed to get project messages:', error);
      throw error;
    }
  }

  async getUserMessages(userId: string, limit: number = 50, lastKey?: string): Promise<{
    messages: Message[];
    lastKey?: string;
  }> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined
      });

      const result = await this.dynamoClient.send(command);
      
      return {
        messages: result.Items as Message[] || [],
        lastKey: result.LastEvaluatedKey ? 
          Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
          undefined
      };
    } catch (error) {
      logger.error('Failed to get user messages:', error);
      throw error;
    }
  }

  async markMessageAsRead(messageId: string, projectId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: `MESSAGE#${messageId}`
        },
        UpdateExpression: 'SET isRead = :isRead, readAt = :readAt',
        ExpressionAttributeValues: {
          ':isRead': true,
          ':readAt': now,
          ':userId': userId
        },
        ConditionExpression: 'recipientId = :userId'
      }));

      logger.info(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error) {
      logger.error('Failed to mark message as read:', error);
      throw error;
    }
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI3',
        KeyConditionExpression: 'GSI3PK = :userId',
        FilterExpression: 'isRead = :isRead',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':isRead': false
        },
        Select: 'COUNT'
      });

      const result = await this.dynamoClient.send(command);
      return result.Count || 0;
    } catch (error) {
      logger.error('Failed to get unread message count:', error);
      return 0;
    }
  }

  async getConversation(projectId: string, userId1: string, userId2: string, limit: number = 50): Promise<Message[]> {
    try {
      // Validate both users have access to the project
      await this.validateProjectAccess(projectId, userId1);
      await this.validateProjectAccess(projectId, userId2);

      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: '(senderId = :user1 AND recipientId = :user2) OR (senderId = :user2 AND recipientId = :user1)',
        ExpressionAttributeValues: {
          ':pk': `PROJECT#${projectId}`,
          ':sk': 'MESSAGE#',
          ':user1': userId1,
          ':user2': userId2
        },
        ScanIndexForward: true,
        Limit: limit
      });

      const result = await this.dynamoClient.send(command);
      return result.Items as Message[] || [];
    } catch (error) {
      logger.error('Failed to get conversation:', error);
      throw error;
    }
  }

  private async notifyNewMessage(message: Message): Promise<void> {
    try {
      // Get sender details for notification
      const sender = await this.getUser(message.senderId);
      const senderName = sender?.profile?.firstName ? 
        `${sender.profile.firstName} ${sender.profile.lastName || ''}`.trim() : 
        'Someone';

      await this.notificationService.sendNotification({
        userId: message.recipientId,
        type: 'communication_message',
        title: `New message${message.subject ? `: ${message.subject}` : ''}`,
        message: `You have a new message from ${senderName}`,
        data: {
          messageId: message.id,
          projectId: message.projectId,
          senderId: message.senderId,
          senderName,
          subject: message.subject,
          messageContent: message.content.substring(0, 200) + (message.content.length > 200 ? '...' : ''),
          messageUrl: `/projects/${message.projectId}/messages`
        },
        projectId: message.projectId,
        priority: 'medium',
        channels: ['email', 'in_app', 'websocket']
      });
    } catch (error) {
      logger.error('Failed to send message notification:', error);
      // Don't throw - message was sent successfully even if notification failed
    }
  }

  private async validateProjectAccess(projectId: string, userId: string): Promise<void> {
    try {
      // Get project details
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Check if user is the project owner
      if (project.ownerId === userId) {
        return;
      }

      // Check if user is a builder with a quote for this project
      const hasQuote = await this.checkBuilderQuote(projectId, userId);
      if (hasQuote) {
        return;
      }

      throw new Error('User does not have access to this project');
    } catch (error) {
      logger.error('Project access validation failed:', error);
      throw error;
    }
  }

  private async getProject(projectId: string): Promise<any> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA'
        }
      });

      const result = await this.dynamoClient.send(command);
      return result.Item;
    } catch (error) {
      logger.error('Failed to get project:', error);
      return null;
    }
  }

  private async checkBuilderQuote(projectId: string, builderId: string): Promise<boolean> {
    try {
      // Get the SoW for this project
      const project = await this.getProject(projectId);
      if (!project?.sowId) {
        return false;
      }

      // Check if builder has submitted a quote
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        FilterExpression: 'builderId = :builderId',
        ExpressionAttributeValues: {
          ':pk': `SOW#${project.sowId}`,
          ':sk': 'QUOTE#',
          ':builderId': builderId
        },
        Select: 'COUNT'
      });

      const result = await this.dynamoClient.send(command);
      return (result.Count || 0) > 0;
    } catch (error) {
      logger.error('Failed to check builder quote:', error);
      return false;
    }
  }

  private async getUser(userId: string): Promise<any> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE'
        }
      });

      const result = await this.dynamoClient.send(command);
      return result.Item;
    } catch (error) {
      logger.error('Failed to get user:', error);
      return null;
    }
  }

  // Builder-specific communication methods
  async sendClarificationRequest(projectId: string, builderId: string, question: string): Promise<Message> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    return this.sendMessage({
      projectId,
      senderId: builderId,
      recipientId: project.ownerId,
      subject: 'Clarification Request',
      content: question
    });
  }

  async sendQuoteSubmissionNotification(projectId: string, builderId: string): Promise<void> {
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const builder = await this.getUser(builderId);
    const builderName = builder?.profile?.firstName ? 
      `${builder.profile.firstName} ${builder.profile.lastName || ''}`.trim() : 
      'A builder';

    await this.sendMessage({
      projectId,
      senderId: builderId,
      recipientId: project.ownerId,
      subject: 'Quote Submitted',
      content: `${builderName} has submitted a quote for your project. You can review it in your dashboard.`
    });
  }
}