import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../routes/notifications';
import { NotificationService } from '../../services/NotificationService';

// Mock the NotificationService
jest.mock('../../services/NotificationService');

// Mock auth middleware
const mockAuth = (req: any, res: any, next: any) => {
  req.user = { userId: 'user123', email: 'test@example.com' };
  next();
};

jest.mock('../../middleware/auth', () => ({
  auth: mockAuth
}));

describe('Notification Routes', () => {
  let app: express.Application;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockNotificationService = {
      getUserNotifications: jest.fn(),
      markNotificationAsRead: jest.fn(),
      getUserPreferences: jest.fn(),
      updateUserPreferences: jest.fn(),
      unsubscribeUser: jest.fn(),
      sendNotification: jest.fn()
    } as any;

    (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);

    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
  });

  describe('GET /api/notifications', () => {
    it('should get user notifications successfully', async () => {
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
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          notifications: mockNotifications,
          lastKey: undefined
        }
      });

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user123', 50, undefined);
    });

    it('should handle query parameters', async () => {
      mockNotificationService.getUserNotifications.mockResolvedValue({
        notifications: [],
        lastKey: 'next-key'
      });

      await request(app)
        .get('/api/notifications?limit=10&lastKey=current-key')
        .expect(200);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('user123', 10, 'current-key');
    });

    it('should handle service errors', async () => {
      mockNotificationService.getUserNotifications.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/notifications')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get notifications'
      });
    });
  });

  describe('PATCH /api/notifications/:notificationId/read', () => {
    it('should mark notification as read', async () => {
      mockNotificationService.markNotificationAsRead.mockResolvedValue();

      const response = await request(app)
        .patch('/api/notifications/notif123/read')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Notification marked as read'
      });

      expect(mockNotificationService.markNotificationAsRead).toHaveBeenCalledWith('notif123', 'user123');
    });

    it('should handle service errors', async () => {
      mockNotificationService.markNotificationAsRead.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .patch('/api/notifications/notif123/read')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to mark notification as read'
      });
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
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPreferences
      });

      expect(mockNotificationService.getUserPreferences).toHaveBeenCalledWith('user123');
    });

    it('should handle null preferences', async () => {
      mockNotificationService.getUserPreferences.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/notifications/preferences')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: null
      });
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
        .send(preferences)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Notification preferences updated'
      });

      expect(mockNotificationService.updateUserPreferences).toHaveBeenCalledWith('user123', preferences);
    });

    it('should handle service errors', async () => {
      mockNotificationService.updateUserPreferences.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .put('/api/notifications/preferences')
        .send({ emailEnabled: false })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update notification preferences'
      });
    });
  });

  describe('POST /api/notifications/unsubscribe/:token', () => {
    it('should unsubscribe user with valid token', async () => {
      mockNotificationService.unsubscribeUser.mockResolvedValue();

      const response = await request(app)
        .post('/api/notifications/unsubscribe/valid-token')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Successfully unsubscribed from notifications'
      });

      expect(mockNotificationService.unsubscribeUser).toHaveBeenCalledWith('valid-token');
    });

    it('should handle invalid token', async () => {
      mockNotificationService.unsubscribeUser.mockRejectedValue(new Error('Invalid token'));

      const response = await request(app)
        .post('/api/notifications/unsubscribe/invalid-token')
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Invalid unsubscribe token'
      });
    });
  });

  describe('POST /api/notifications/test', () => {
    it('should send test notification', async () => {
      const testNotification = {
        id: 'test-notif',
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test',
        status: 'sent',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockNotificationService.sendNotification.mockResolvedValue(testNotification as any);

      const response = await request(app)
        .post('/api/notifications/test')
        .send({
          type: 'system_alert',
          title: 'Test Notification',
          message: 'This is a test',
          channels: ['in_app']
        })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: testNotification
      });

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test',
        channels: ['in_app'],
        priority: 'low'
      });
    });

    it('should use default values for test notification', async () => {
      const testNotification = {
        id: 'test-notif',
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification',
        status: 'sent',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockNotificationService.sendNotification.mockResolvedValue(testNotification as any);

      const response = await request(app)
        .post('/api/notifications/test')
        .send({})
        .expect(200);

      expect(mockNotificationService.sendNotification).toHaveBeenCalledWith({
        userId: 'user123',
        type: 'system_alert',
        title: 'Test Notification',
        message: 'This is a test notification',
        channels: ['in_app'],
        priority: 'low'
      });
    });

    it('should handle service errors', async () => {
      mockNotificationService.sendNotification.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/notifications/test')
        .send({})
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to send test notification'
      });
    });
  });
});