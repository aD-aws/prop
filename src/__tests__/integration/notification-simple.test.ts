import request from 'supertest';
import express from 'express';
import notificationRoutes from '../../routes/notifications';
import messageRoutes from '../../routes/messages';

// Mock services
jest.mock('../../services/NotificationService', () => ({
  NotificationService: jest.fn().mockImplementation(() => ({
    getUserNotifications: jest.fn().mockResolvedValue({ notifications: [], lastKey: undefined }),
    getUserPreferences: jest.fn().mockResolvedValue(null),
    markNotificationAsRead: jest.fn().mockResolvedValue(undefined),
    updateUserPreferences: jest.fn().mockResolvedValue(undefined),
    sendNotification: jest.fn().mockResolvedValue({ id: 'test' })
  }))
}));

jest.mock('../../services/CommunicationService', () => ({
  CommunicationService: jest.fn().mockImplementation(() => ({
    getUserMessages: jest.fn().mockResolvedValue({ messages: [], lastKey: undefined }),
    getUnreadMessageCount: jest.fn().mockResolvedValue(0),
    sendMessage: jest.fn().mockResolvedValue({ id: 'test' }),
    markMessageAsRead: jest.fn().mockResolvedValue(undefined)
  }))
}));

// Mock auth middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { userId: 'user123', email: 'test@example.com' };
    next();
  }
}));

describe('Notification and Communication Integration - Simple Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/messages', messageRoutes);
  });

  describe('Notification Routes', () => {
    it('should have notification routes mounted', async () => {
      // Test that routes are accessible
      const response = await request(app)
        .get('/api/notifications')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });

    it('should have preferences route', async () => {
      const response = await request(app)
        .get('/api/notifications/preferences')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });
  });

  describe('Message Routes', () => {
    it('should have message routes mounted', async () => {
      const response = await request(app)
        .get('/api/messages/user')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });

    it('should have unread count route', async () => {
      const response = await request(app)
        .get('/api/messages/unread-count')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.success).toBe(true);
    });
  });
});