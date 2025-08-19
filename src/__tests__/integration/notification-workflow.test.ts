import request from 'supertest';
import app from '../../app';
import { NotificationService } from '../../services/NotificationService';
import { CommunicationService } from '../../services/CommunicationService';
import { WebSocketService } from '../../services/WebSocketService';

// Mock services
jest.mock('../../services/NotificationService');
jest.mock('../../services/CommunicationService');
jest.mock('../../services/WebSocketService');

describe('Notification Workflow Integration Tests', () => {
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockCommunicationService: jest.Mocked<CommunicationService>;
  let mockWebSocketService: jest.Mocked<WebSocketService>;

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
    userType: 'homeowner'
  };

  const mockAuthToken = 'valid-jwt-token';

  beforeEach(() => {
    jest.clearAllMocks();

    mockNotificationService = {
      sendNotification: jest.fn(),
      getUserNotifications: jest.fn(),
      markNotificationAsRead: jest.fn(),
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      unsubscribeUser: jest.fn(),
      notifyProjectMilestone: jest.fn(),
      notifyStatusChange: jest.fn(),
      sendBulkNotifications: jest.fn()
    } as any;

    mockCommunicationService = {
      sendMessage: jest.fn(),
      getProjectMessages: jest.fn(),
      getUserMessages: jest.fn(),
      markMessageAsRead: jest.fn(),
      getUnreadMessageCount: jest.fn(),
      getConversation: jest.fn(),
      sendClarificationRequest: jest.fn(),
      sendQuoteSubmissionNotification: jest.fn()
    } as any;

    mockWebSocketService = {
      sendToUser: jest.fn(),
      sendToProject: jest.fn(),
      getConnectedUsers: jest.fn(),
      getUserConnectionCount: jest.fn()
    } as any;

    (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);
    (CommunicationService as jest.Mock).mockReturnValue(mockCommunicationService);
    (WebSocketService as jest.Mock).mockReturnValue(mockWebSocketService);

    // Mock auth middleware
    jest.doMock('../../middleware/auth', () => ({
      auth: (req: any, res: any, next: any) => {
        req.user = mockUser;
        next();
      }
    }));
  });

  describe('Notification API Endpoints', () => {
    describe('GET /api/notifications', () => {
      it('should get user notifications', async () => {
        const mockNotifications = [
          {
            id: 'notif1',
            type: 'project_created',
            title: 'Project Created',
            message: 'Your project has been created',
            status: 'sent',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        mockNotificationService.getUserNotifications.mockResolvedValue({
          notifications: mockNotifications,
          lastKey: undefined
        });

        const response = await request(app)
          .get('/api/notifications')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.notifications).toEqual(mockNotifications);
        expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user123', 50, undefined);
      });

      it('should handle pagination', async () => {
        const mockNotifications = [
          {
            id: 'notif1',
            type: 'project_created',
            title: 'Project Created',
            message: 'Your project has been created',
            status: 'sent',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        mockNotificationService.getUserNotifications.mockResolvedValue({
          notifications: mockNotifications,
          lastKey: 'next-page-key'
        });

        const response = await request(app)
          .get('/api/notifications?limit=10&lastKey=current-page-key')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.lastKey).toBe('next-page-key');
        expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user123', 10, 'current-page-key');
      });
    });

    describe('PATCH /api/notifications/:notificationId/read', () => {
      it('should mark notification as read', async () => {
        mockNotificationService.markNotificationAsRead.mockResolvedValue();

        const response = await request(app)
          .patch('/api/notifications/notif123/read')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Notification marked as read');
        expect(mockNotificationService.markNotificationAsRead).toHaveBeenCalledWith('notif123', 'user123');
      });
    });

    describe('GET /api/notifications/preferences', () => {
      it('should get notification preferences', async () => {
        const mockPreferences = {
          userId: 'user123',
          emailEnabled: true,
          inAppEnabled: true,
          preferences: {
            project_created: { email: true, inApp: true }
          }
        };

        mockNotificationService.getUserPreferences.mockResolvedValue(mockPreferences);

        const response = await request(app)
          .get('/api/notifications/preferences')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockPreferences);
      });
    });

    describe('PUT /api/notifications/preferences', () => {
      it('should update notification preferences', async () => {
        const preferences = {
          emailEnabled: false,
          preferences: {
            project_created: { email: false, inApp: true }
          }
        };

        mockNotificationService.updateUserPreferences.mockResolvedValue();

        const response = await request(app)
          .put('/api/notifications/preferences')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send(preferences)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(mockNotificationService.updateUserPreferences).toHaveBeenCalledWith('user123', preferences);
      });
    });

    describe('POST /api/notifications/unsubscribe/:token', () => {
      it('should unsubscribe user with valid token', async () => {
        mockNotificationService.unsubscribeUser.mockResolvedValue();

        const response = await request(app)
          .post('/api/notifications/unsubscribe/valid-token')
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.message).toBe('Successfully unsubscribed from notifications');
        expect(mockNotificationService.unsubscribeUser).toHaveBeenCalledWith('valid-token');
      });

      it('should handle invalid token', async () => {
        mockNotificationService.unsubscribeUser.mockRejectedValue(new Error('Invalid token'));

        const response = await request(app)
          .post('/api/notifications/unsubscribe/invalid-token')
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid unsubscribe token');
      });
    });
  });

  describe('Message API Endpoints', () => {
    describe('POST /api/messages', () => {
      it('should send message', async () => {
        const messageData = {
          projectId: 'project123',
          recipientId: 'user456',
          subject: 'Test Subject',
          content: 'Test message content'
        };

        const mockMessage = {
          id: 'msg123',
          ...messageData,
          senderId: 'user123',
          createdAt: '2024-01-01T00:00:00Z'
        };

        mockCommunicationService.sendMessage.mockResolvedValue(mockMessage);

        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send(messageData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMessage);
        expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith({
          ...messageData,
          senderId: 'user123'
        });
      });

      it('should validate message data', async () => {
        const invalidData = {
          projectId: 'project123',
          recipientId: 'user456'
          // missing content
        };

        const response = await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send(invalidData)
          .expect(400);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toBe('Invalid request data');
      });
    });

    describe('GET /api/messages/project/:projectId', () => {
      it('should get project messages', async () => {
        const mockMessages = [
          {
            id: 'msg1',
            projectId: 'project123',
            senderId: 'user1',
            recipientId: 'user2',
            content: 'Hello',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        mockCommunicationService.getProjectMessages.mockResolvedValue({
          messages: mockMessages,
          lastKey: undefined
        });

        const response = await request(app)
          .get('/api/messages/project/project123')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.messages).toEqual(mockMessages);
        expect(mockCommunicationService.getProjectMessages).toHaveBeenCalledWith('project123', 'user123', 50, undefined);
      });
    });

    describe('GET /api/messages/user', () => {
      it('should get user messages', async () => {
        const mockMessages = [
          {
            id: 'msg1',
            recipientId: 'user123',
            senderId: 'user2',
            content: 'Hello',
            createdAt: '2024-01-01T00:00:00Z'
          }
        ];

        mockCommunicationService.getUserMessages.mockResolvedValue({
          messages: mockMessages,
          lastKey: undefined
        });

        const response = await request(app)
          .get('/api/messages/user')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.messages).toEqual(mockMessages);
        expect(mockCommunicationService.getUserMessages).toHaveBeenCalledWith('user123', 50, undefined);
      });
    });

    describe('GET /api/messages/unread-count', () => {
      it('should get unread message count', async () => {
        mockCommunicationService.getUnreadMessageCount.mockResolvedValue(5);

        const response = await request(app)
          .get('/api/messages/unread-count')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.count).toBe(5);
        expect(mockCommunicationService.getUnreadMessageCount).toHaveBeenCalledWith('user123');
      });
    });

    describe('POST /api/messages/clarification', () => {
      it('should send clarification request', async () => {
        const requestData = {
          projectId: 'project123',
          question: 'What type of foundation is required?'
        };

        const mockMessage = {
          id: 'msg123',
          projectId: 'project123',
          senderId: 'user123',
          recipientId: 'homeowner1',
          subject: 'Clarification Request',
          content: 'What type of foundation is required?',
          createdAt: '2024-01-01T00:00:00Z'
        };

        mockCommunicationService.sendClarificationRequest.mockResolvedValue(mockMessage);

        const response = await request(app)
          .post('/api/messages/clarification')
          .set('Authorization', `Bearer ${mockAuthToken}`)
          .send(requestData)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toEqual(mockMessage);
        expect(mockCommunicationService.sendClarificationRequest).toHaveBeenCalledWith(
          'project123',
          'user123',
          'What type of foundation is required?'
        );
      });
    });
  });

  describe('End-to-End Notification Workflows', () => {
    it('should handle complete project creation notification flow', async () => {
      // Simulate project creation triggering notification
      const notificationData = {
        userId: 'user123',
        type: 'project_created' as const,
        title: 'Project Created',
        message: 'Your project has been created successfully',
        projectId: 'project123',
        channels: ['email', 'in_app', 'websocket'] as const
      };

      mockNotificationService.sendNotification.mockResolvedValue({
        id: 'notif123',
        ...notificationData,
        status: 'sent',
        createdAt: '2024-01-01T00:00:00Z'
      } as any);

      // Test notification sending
      const response = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          type: 'project_created',
          title: 'Project Created',
          message: 'Your project has been created successfully',
          channels: ['email', 'in_app', 'websocket']
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          type: 'project_created',
          title: 'Project Created',
          message: 'Your project has been created successfully'
        })
      );
    });

    it('should handle builder-homeowner communication flow', async () => {
      // 1. Builder sends clarification request
      const clarificationData = {
        projectId: 'project123',
        question: 'What type of insulation do you prefer?'
      };

      const mockClarificationMessage = {
        id: 'msg1',
        projectId: 'project123',
        senderId: 'builder1',
        recipientId: 'homeowner1',
        subject: 'Clarification Request',
        content: 'What type of insulation do you prefer?',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockCommunicationService.sendClarificationRequest.mockResolvedValue(mockClarificationMessage);

      const clarificationResponse = await request(app)
        .post('/api/messages/clarification')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(clarificationData)
        .expect(201);

      expect(clarificationResponse.body.success).toBe(true);

      // 2. Homeowner responds
      const responseData = {
        projectId: 'project123',
        recipientId: 'builder1',
        content: 'I prefer mineral wool insulation for better fire resistance.'
      };

      const mockResponseMessage = {
        id: 'msg2',
        projectId: 'project123',
        senderId: 'homeowner1',
        recipientId: 'builder1',
        content: 'I prefer mineral wool insulation for better fire resistance.',
        createdAt: '2024-01-01T01:00:00Z'
      };

      mockCommunicationService.sendMessage.mockResolvedValue(mockResponseMessage);

      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send(responseData)
        .expect(201);

      expect(messageResponse.body.success).toBe(true);

      // 3. Get conversation history
      const mockConversation = [mockClarificationMessage, mockResponseMessage];
      mockCommunicationService.getConversation.mockResolvedValue(mockConversation);

      const conversationResponse = await request(app)
        .get('/api/messages/conversation/project123/builder1')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(200);

      expect(conversationResponse.body.success).toBe(true);
      expect(conversationResponse.body.data).toEqual(mockConversation);
    });
  });

  describe('Error Handling', () => {
    it('should handle notification service errors', async () => {
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get notifications');
    });

    it('should handle communication service errors', async () => {
      mockCommunicationService.sendMessage.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${mockAuthToken}`)
        .send({
          projectId: 'project123',
          recipientId: 'user456',
          content: 'Test message'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to send message');
    });
  });
});