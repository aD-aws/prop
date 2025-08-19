import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { v4 as uuidv4 } from 'uuid';
import { 
  Notification, 
  NotificationPreferences, 
  NotificationTemplate,
  NotificationType,
  NotificationChannel,
  NotificationPriority,
  NotificationStatus
} from '../models/Notification';
import { logger } from '../utils/logger';
import { WebSocketService } from './WebSocketService';
import { TemplateService } from './TemplateService';

export interface NotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  projectId?: string;
  quoteId?: string;
  contractId?: string;
  scheduledFor?: Date;
}

export class NotificationService {
  private dynamoClient: DynamoDBDocumentClient;
  private sesClient: SESClient;
  private webSocketService: WebSocketService;
  private templateService: TemplateService;
  private tableName: string;

  constructor() {
    const client = new DynamoDBClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.dynamoClient = DynamoDBDocumentClient.from(client);
    this.sesClient = new SESClient({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.webSocketService = new WebSocketService();
    this.templateService = new TemplateService();
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform';
  }

  async sendNotification(data: NotificationData): Promise<Notification> {
    try {
      // Check user notification preferences
      const preferences = await this.getUserPreferences(data.userId);
      if (preferences?.gdprOptOut) {
        logger.info(`User ${data.userId} has opted out of notifications`);
        throw new Error('User has opted out of notifications');
      }

      // Create notification record
      const notification = await this.createNotification(data);

      // Send through enabled channels
      const enabledChannels = this.getEnabledChannels(data.channels || ['email', 'in_app'], preferences, data.type);
      
      for (const channel of enabledChannels) {
        try {
          switch (channel) {
            case 'email':
              await this.sendEmailNotification(notification);
              break;
            case 'in_app':
              await this.createInAppNotification(notification);
              break;
            case 'websocket':
              await this.sendWebSocketNotification(notification);
              break;
          }
        } catch (error) {
          logger.error(`Failed to send ${channel} notification:`, error);
          // Continue with other channels
        }
      }

      // Update notification status
      await this.updateNotificationStatus(notification.id, 'sent');

      return notification;
    } catch (error) {
      logger.error('Failed to send notification:', error);
      throw error;
    }
  }

  async sendBulkNotifications(notifications: NotificationData[]): Promise<void> {
    const promises = notifications.map(notification => 
      this.sendNotification(notification).catch(error => {
        logger.error(`Failed to send notification to user ${notification.userId}:`, error);
        return null;
      })
    );

    await Promise.allSettled(promises);
  }

  private async createNotification(data: NotificationData): Promise<Notification> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const notification: Notification = {
      PK: `NOTIFICATION#${id}`,
      SK: 'METADATA',
      id,
      userId: data.userId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      channels: data.channels || ['email', 'in_app'],
      priority: data.priority || 'medium',
      status: 'pending',
      projectId: data.projectId,
      quoteId: data.quoteId,
      contractId: data.contractId,
      scheduledFor: data.scheduledFor?.toISOString(),
      createdAt: now,
      updatedAt: now,
      GSI1PK: data.userId,
      GSI1SK: `pending#${now}`,
      GSI2PK: data.projectId,
      GSI2SK: `${data.type}#${now}`
    };

    await this.dynamoClient.send(new PutCommand({
      TableName: this.tableName,
      Item: notification
    }));

    return notification;
  }

  private async sendEmailNotification(notification: Notification): Promise<void> {
    try {
      // Get user email
      const user = await this.getUser(notification.userId);
      if (!user?.email) {
        throw new Error('User email not found');
      }

      // Get email template
      const template = await this.templateService.getTemplate(notification.type, 'email');
      const emailContent = await this.templateService.renderTemplate(template, {
        ...notification.data,
        title: notification.title,
        message: notification.message,
        userName: user.profile?.firstName || 'User'
      });

      const command = new SendEmailCommand({
        Source: process.env.FROM_EMAIL || 'noreply@homeimprovement.co.uk',
        Destination: {
          ToAddresses: [user.email]
        },
        Message: {
          Subject: {
            Data: notification.title,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: emailContent,
              Charset: 'UTF-8'
            }
          }
        }
      });

      await this.sesClient.send(command);
      logger.info(`Email notification sent to ${user.email}`);
    } catch (error) {
      logger.error('Failed to send email notification:', error);
      throw error;
    }
  }

  private async createInAppNotification(notification: Notification): Promise<void> {
    // In-app notifications are stored in DynamoDB and retrieved by the frontend
    // The notification is already created, just log for tracking
    logger.info(`In-app notification created for user ${notification.userId}`);
  }

  private async sendWebSocketNotification(notification: Notification): Promise<void> {
    try {
      await this.webSocketService.sendToUser(notification.userId, {
        type: 'notification',
        data: {
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          priority: notification.priority,
          createdAt: notification.createdAt
        }
      });
      logger.info(`WebSocket notification sent to user ${notification.userId}`);
    } catch (error) {
      logger.error('Failed to send WebSocket notification:', error);
      throw error;
    }
  }

  async getUserNotifications(userId: string, limit: number = 50, lastKey?: string): Promise<{
    notifications: Notification[];
    lastKey?: string;
  }> {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false,
        Limit: limit,
        ExclusiveStartKey: lastKey ? JSON.parse(Buffer.from(lastKey, 'base64').toString()) : undefined
      });

      const result = await this.dynamoClient.send(command);
      
      return {
        notifications: result.Items as Notification[] || [],
        lastKey: result.LastEvaluatedKey ? 
          Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64') : 
          undefined
      };
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  async markNotificationAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `NOTIFICATION#${notificationId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET #status = :status, readAt = :readAt, updatedAt = :updatedAt, GSI1SK = :gsi1sk',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': 'read',
          ':readAt': now,
          ':updatedAt': now,
          ':gsi1sk': `read#${now}`,
          ':userId': userId
        },
        ConditionExpression: 'userId = :userId'
      }));

      logger.info(`Notification ${notificationId} marked as read`);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    try {
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'NOTIFICATION_PREFERENCES'
        }
      });

      const result = await this.dynamoClient.send(command);
      return result.Item as NotificationPreferences || null;
    } catch (error) {
      logger.error('Failed to get user preferences:', error);
      return null;
    }
  }

  async updateUserPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const existing = await this.getUserPreferences(userId);
      const now = new Date().toISOString();

      const updated: NotificationPreferences = {
        PK: `USER#${userId}`,
        SK: 'NOTIFICATION_PREFERENCES',
        userId,
        emailEnabled: preferences.emailEnabled ?? existing?.emailEnabled ?? true,
        inAppEnabled: preferences.inAppEnabled ?? existing?.inAppEnabled ?? true,
        websocketEnabled: preferences.websocketEnabled ?? existing?.websocketEnabled ?? true,
        preferences: { ...existing?.preferences, ...preferences.preferences },
        gdprOptOut: preferences.gdprOptOut ?? existing?.gdprOptOut ?? false,
        unsubscribeToken: existing?.unsubscribeToken || uuidv4(),
        createdAt: existing?.createdAt || now,
        updatedAt: now
      };

      await this.dynamoClient.send(new PutCommand({
        TableName: this.tableName,
        Item: updated
      }));

      logger.info(`Updated notification preferences for user ${userId}`);
    } catch (error) {
      logger.error('Failed to update user preferences:', error);
      throw error;
    }
  }

  async unsubscribeUser(token: string): Promise<void> {
    try {
      // Find user by unsubscribe token
      const command = new QueryCommand({
        TableName: this.tableName,
        FilterExpression: 'unsubscribeToken = :token',
        ExpressionAttributeValues: {
          ':token': token
        }
      });

      const result = await this.dynamoClient.send(command);
      const preferences = result.Items?.[0] as NotificationPreferences;

      if (!preferences) {
        throw new Error('Invalid unsubscribe token');
      }

      // Update preferences to opt out
      await this.updateUserPreferences(preferences.userId, {
        gdprOptOut: true,
        emailEnabled: false
      });

      logger.info(`User ${preferences.userId} unsubscribed via token`);
    } catch (error) {
      logger.error('Failed to unsubscribe user:', error);
      throw error;
    }
  }

  private getEnabledChannels(
    requestedChannels: NotificationChannel[], 
    preferences: NotificationPreferences | null, 
    type: NotificationType
  ): NotificationChannel[] {
    if (!preferences) {
      return requestedChannels;
    }

    const enabled: NotificationChannel[] = [];

    for (const channel of requestedChannels) {
      const globalEnabled = preferences[`${channel}Enabled` as keyof NotificationPreferences] as boolean;
      
      // Map channel names to preference keys
      const channelKey = channel === 'in_app' ? 'inApp' : channel;
      const typeEnabled = preferences.preferences[type]?.[channelKey as keyof typeof preferences.preferences[typeof type]] ?? true;

      if (globalEnabled && typeEnabled) {
        enabled.push(channel);
      }
    }

    return enabled;
  }

  private async updateNotificationStatus(notificationId: string, status: NotificationStatus): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      await this.dynamoClient.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          PK: `NOTIFICATION#${notificationId}`,
          SK: 'METADATA'
        },
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt, GSI1SK = :gsi1sk',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: {
          ':status': status,
          ':updatedAt': now,
          ':gsi1sk': `${status}#${now}`
        }
      }));
    } catch (error) {
      logger.error('Failed to update notification status:', error);
      throw error;
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

  // Project milestone notifications
  async notifyProjectMilestone(projectId: string, milestone: string, data?: Record<string, any>): Promise<void> {
    try {
      // Get project details to find owner
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      await this.sendNotification({
        userId: project.ownerId,
        type: 'milestone_reached',
        title: `Project Milestone: ${milestone}`,
        message: `Your project has reached a new milestone: ${milestone}`,
        data: { milestone, ...data },
        projectId,
        priority: 'medium',
        channels: ['email', 'in_app', 'websocket']
      });

      logger.info(`Milestone notification sent for project ${projectId}`);
    } catch (error) {
      logger.error('Failed to send milestone notification:', error);
      throw error;
    }
  }

  // Status change notifications
  async notifyStatusChange(projectId: string, oldStatus: string, newStatus: string): Promise<void> {
    try {
      const project = await this.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      await this.sendNotification({
        userId: project.ownerId,
        type: 'project_updated',
        title: 'Project Status Updated',
        message: `Your project status has changed from ${oldStatus} to ${newStatus}`,
        data: { oldStatus, newStatus },
        projectId,
        priority: 'medium',
        channels: ['email', 'in_app', 'websocket']
      });

      logger.info(`Status change notification sent for project ${projectId}`);
    } catch (error) {
      logger.error('Failed to send status change notification:', error);
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
}