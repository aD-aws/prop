import { NotificationService } from '../../services/NotificationService';
import { WebSocketService } from '../../services/WebSocketService';
import { TemplateService } from '../../services/TemplateService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SESClient } from '@aws-sdk/client-ses';

// Mock AWS clients
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('@aws-sdk/client-ses');
jest.mock('../../services/WebSocketService');
jest.mock('../../services/TemplateService');

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockDynamoClient: jest.Mocked<DynamoDBDocumentClient>;
  let mockSESClient: jest.Mocked<SESClient>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;
  let mockTemplateService: jest.Mocked<TemplateService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDynamoClient = {
      send: jest.fn()
    } as any;

    mockSESClient = {
      send: jest.fn()
    } as any;

    mockWebSocketService = {
      sendToUser: jest.fn()
    } as any;

    mockTemplateService = {
      getTemplate: jest.fn(),
      renderTemplate: jest.fn()
    } as any;

    // Mock the constructors
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDynamoClient);
    (SESClient as jest.Mock).mockReturnValue(mockSESClient);
    (WebSocketService as jest.Mock).mockReturnValue(mockWebSocketService);
    (TemplateService as jest.Mock).mockReturnValue(mockTemplateService);

    notificationService = new NotificationService();
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'project_created' as const,
        title: 'Project Created',
        message: 'Your project has been created',
        channels: ['email', 'in_app'] as any,
        priority: 'medium' as const
      };

      // Mock user preferences
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          userId: 'user123',
          emailEnabled: true,
          inAppEnabled: true,
          preferences: {
            project_created: {
              email: true,
              inApp: true
            }
          },
          gdprOptOut: false
        }
      });

      // Mock user details
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          email: 'user@example.com',
          profile: { firstName: 'John' }
        }
      });

      // Mock template
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'template1',
        emailTemplate: '<p>{{message}}</p>',
        inAppTemplate: '{{message}}',
        variables: ['message']
      } as any);

      mockTemplateService.renderTemplate.mockResolvedValue('<p>Your project has been created</p>');

      // Mock DynamoDB put for notification creation
      mockDynamoClient.send.mockResolvedValueOnce({});

      // Mock SES send
      mockSESClient.send.mockResolvedValueOnce({});

      // Mock WebSocket send
      mockWebSocketService.sendToUser.mockResolvedValueOnce();

      // Mock notification status update
      mockDynamoClient.send.mockResolvedValueOnce({});

      const result = await notificationService.sendNotification(notificationData);

      expect(result).toBeDefined();
      expect(result.type).toBe('project_created');
      expect(result.title).toBe('Project Created');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(4); // preferences, user, create, update
      expect(mockSESClient.send).toHaveBeenCalledTimes(1);
      expect(mockWebSocketService.sendToUser).toHaveBeenCalledTimes(1);
    });

    it('should not send notification if user has opted out', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'project_created' as const,
        title: 'Project Created',
        message: 'Your project has been created'
      };

      // Mock user preferences with GDPR opt-out
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          userId: 'user123',
          gdprOptOut: true
        }
      });

      await expect(notificationService.sendNotification(notificationData))
        .rejects.toThrow('User has opted out of notifications');

      expect(mockSESClient.send).not.toHaveBeenCalled();
      expect(mockWebSocketService.sendToUser).not.toHaveBeenCalled();
    });

    it('should handle email sending failure gracefully', async () => {
      const notificationData = {
        userId: 'user123',
        type: 'project_created' as const,
        title: 'Project Created',
        message: 'Your project has been created',
        channels: ['email'] as any
      };

      // Mock user preferences
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          userId: 'user123',
          emailEnabled: true,
          preferences: {
            project_created: { email: true }
          },
          gdprOptOut: false
        }
      });

      // Mock user details
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          email: 'user@example.com',
          profile: { firstName: 'John' }
        }
      });

      // Mock template
      mockTemplateService.getTemplate.mockResolvedValue({
        id: 'template1',
        emailTemplate: '<p>{{message}}</p>',
        variables: ['message']
      } as any);

      mockTemplateService.renderTemplate.mockResolvedValue('<p>Your project has been created</p>');

      // Mock DynamoDB put for notification creation
      mockDynamoClient.send.mockResolvedValueOnce({});

      // Mock SES send failure
      mockSESClient.send.mockRejectedValueOnce(new Error('SES Error'));

      // Mock notification status update
      mockDynamoClient.send.mockResolvedValueOnce({});

      const result = await notificationService.sendNotification(notificationData);

      expect(result).toBeDefined();
      expect(mockSESClient.send).toHaveBeenCalledTimes(1);
      // Should still update status to 'sent' even if email fails
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining('SET #status = :status')
        })
      );
    });
  });

  describe('getUserNotifications', () => {
    it('should retrieve user notifications', async () => {
      const mockNotifications = [
        {
          id: 'notif1',
          userId: 'user123',
          type: 'project_created',
          title: 'Project Created',
          message: 'Your project has been created',
          status: 'sent',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockNotifications,
        LastEvaluatedKey: undefined
      });

      const result = await notificationService.getUserNotifications('user123', 50);

      expect(result.notifications).toEqual(mockNotifications);
      expect(result.lastKey).toBeUndefined();
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          IndexName: 'GSI1',
          KeyConditionExpression: 'GSI1PK = :userId'
        })
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});

      await notificationService.markNotificationAsRead('notif123', 'user123');

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: expect.stringContaining('SET #status = :status, readAt = :readAt'),
          ConditionExpression: 'userId = :userId'
        })
      );
    });
  });

  describe('updateUserPreferences', () => {
    it('should update user notification preferences', async () => {
      const existingPreferences = {
        userId: 'user123',
        emailEnabled: true,
        inAppEnabled: true,
        preferences: {},
        gdprOptOut: false,
        unsubscribeToken: 'token123',
        createdAt: '2024-01-01T00:00:00Z'
      };

      // Mock get existing preferences
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: existingPreferences
      });

      // Mock put updated preferences
      mockDynamoClient.send.mockResolvedValueOnce({});

      const updates = {
        emailEnabled: false,
        preferences: {
          project_created: { email: false, inApp: true }
        }
      };

      await notificationService.updateUserPreferences('user123', updates);

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
      expect(mockDynamoClient.send).toHaveBeenLastCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            emailEnabled: false,
            preferences: expect.objectContaining({
              project_created: { email: false, inApp: true }
            })
          })
        })
      );
    });
  });

  describe('unsubscribeUser', () => {
    it('should unsubscribe user with valid token', async () => {
      const mockPreferences = {
        userId: 'user123',
        unsubscribeToken: 'valid-token'
      };

      // Mock finding user by token
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: [mockPreferences]
      });

      // Mock get existing preferences
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockPreferences
      });

      // Mock update preferences
      mockDynamoClient.send.mockResolvedValueOnce({});

      await notificationService.unsubscribeUser('valid-token');

      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3);
      expect(mockDynamoClient.send).toHaveBeenLastCalledWith(
        expect.objectContaining({
          Item: expect.objectContaining({
            gdprOptOut: true,
            emailEnabled: false
          })
        })
      );
    });

    it('should throw error for invalid token', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: []
      });

      await expect(notificationService.unsubscribeUser('invalid-token'))
        .rejects.toThrow('Invalid unsubscribe token');
    });
  });

  describe('notifyProjectMilestone', () => {
    it('should send milestone notification', async () => {
      const mockProject = {
        ownerId: 'user123',
        id: 'project123'
      };

      // Mock get project
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockProject
      });

      // Mock sendNotification (we'll spy on the method)
      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification')
        .mockResolvedValueOnce({} as any);

      await notificationService.notifyProjectMilestone('project123', 'Foundation Complete');

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: 'PROJECT#project123',
            SK: 'METADATA'
          }
        })
      );

      expect(sendNotificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'milestone_reached',
          title: 'Project Milestone: Foundation Complete',
          projectId: 'project123'
        })
      );

      sendNotificationSpy.mockRestore();
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send multiple notifications', async () => {
      const notifications = [
        {
          userId: 'user1',
          type: 'project_created' as const,
          title: 'Project 1',
          message: 'Message 1'
        },
        {
          userId: 'user2',
          type: 'project_created' as const,
          title: 'Project 2',
          message: 'Message 2'
        }
      ];

      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification')
        .mockResolvedValue({} as any);

      await notificationService.sendBulkNotifications(notifications);

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);
      expect(sendNotificationSpy).toHaveBeenCalledWith(notifications[0]);
      expect(sendNotificationSpy).toHaveBeenCalledWith(notifications[1]);

      sendNotificationSpy.mockRestore();
    });

    it('should handle individual notification failures', async () => {
      const notifications = [
        {
          userId: 'user1',
          type: 'project_created' as const,
          title: 'Project 1',
          message: 'Message 1'
        },
        {
          userId: 'user2',
          type: 'project_created' as const,
          title: 'Project 2',
          message: 'Message 2'
        }
      ];

      const sendNotificationSpy = jest.spyOn(notificationService, 'sendNotification')
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Failed to send'));

      await expect(notificationService.sendBulkNotifications(notifications))
        .resolves.not.toThrow();

      expect(sendNotificationSpy).toHaveBeenCalledTimes(2);

      sendNotificationSpy.mockRestore();
    });
  });
});