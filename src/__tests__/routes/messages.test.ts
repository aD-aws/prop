import request from 'supertest';
import express from 'express';
import messageRoutes from '../../routes/messages';
import { CommunicationService } from '../../services/CommunicationService';

// Mock the CommunicationService
jest.mock('../../services/CommunicationService');

// Mock auth middleware
const mockAuth = (req: any, res: any, next: any) => {
  req.user = { userId: 'user123', email: 'test@example.com' };
  next();
};

jest.mock('../../middleware/auth', () => ({
  auth: mockAuth
}));

describe('Message Routes', () => {
  let app: express.Application;
  let mockCommunicationService: jest.Mocked<CommunicationService>;

  beforeEach(() => {
    jest.clearAllMocks();

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

    (CommunicationService as jest.Mock).mockReturnValue(mockCommunicationService);

    app = express();
    app.use(express.json());
    app.use('/api/messages', messageRoutes);
  });

  describe('POST /api/messages', () => {
    it('should send message successfully', async () => {
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

      mockCommunicationService.sendMessage.mockResolvedValue(mockMessage as any);

      const response = await request(app)
        .post('/api/messages')
        .send(messageData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockMessage
      });

      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith({
        ...messageData,
        senderId: 'user123'
      });
    });

    it('should validate required fields', async () => {
      const invalidData = {
        projectId: 'project123',
        recipientId: 'user456'
        // missing content
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
      expect(response.body.details).toBeDefined();
    });

    it('should validate projectId format', async () => {
      const invalidData = {
        projectId: '', // empty string
        recipientId: 'user456',
        content: 'Test content'
      };

      const response = await request(app)
        .post('/api/messages')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid request data');
    });

    it('should handle service errors', async () => {
      const messageData = {
        projectId: 'project123',
        recipientId: 'user456',
        content: 'Test content'
      };

      mockCommunicationService.sendMessage.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/messages')
        .send(messageData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to send message'
      });
    });

    it('should handle attachments', async () => {
      const messageData = {
        projectId: 'project123',
        recipientId: 'user456',
        content: 'Test content with attachments',
        attachments: [
          {
            filename: 'document.pdf',
            url: 'https://example.com/document.pdf',
            size: 1024
          }
        ]
      };

      const mockMessage = {
        id: 'msg123',
        ...messageData,
        senderId: 'user123',
        createdAt: '2024-01-01T00:00:00Z'
      };

      mockCommunicationService.sendMessage.mockResolvedValue(mockMessage as any);

      const response = await request(app)
        .post('/api/messages')
        .send(messageData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockCommunicationService.sendMessage).toHaveBeenCalledWith({
        ...messageData,
        senderId: 'user123'
      });
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
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          messages: mockMessages,
          lastKey: undefined
        }
      });

      expect(mockCommunicationService.getProjectMessages).toHaveBeenCalledWith('project123', 'user123', 50, undefined);
    });

    it('should handle pagination parameters', async () => {
      mockCommunicationService.getProjectMessages.mockResolvedValue({
        messages: [],
        lastKey: 'next-key'
      });

      await request(app)
        .get('/api/messages/project/project123?limit=10&lastKey=current-key')
        .expect(200);

      expect(mockCommunicationService.getProjectMessages).toHaveBeenCalledWith('project123', 'user123', 10, 'current-key');
    });

    it('should handle service errors', async () => {
      mockCommunicationService.getProjectMessages.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/messages/project/project123')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get project messages'
      });
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
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          messages: mockMessages,
          lastKey: undefined
        }
      });

      expect(mockCommunicationService.getUserMessages).toHaveBeenCalledWith('user123', 50, undefined);
    });
  });

  describe('GET /api/messages/conversation/:projectId/:otherUserId', () => {
    it('should get conversation between users', async () => {
      const mockMessages = [
        {
          id: 'msg1',
          projectId: 'project123',
          senderId: 'user123',
          recipientId: 'user456',
          content: 'Hello',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'msg2',
          projectId: 'project123',
          senderId: 'user456',
          recipientId: 'user123',
          content: 'Hi there',
          createdAt: '2024-01-01T01:00:00Z'
        }
      ];

      mockCommunicationService.getConversation.mockResolvedValue(mockMessages as any);

      const response = await request(app)
        .get('/api/messages/conversation/project123/user456')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockMessages
      });

      expect(mockCommunicationService.getConversation).toHaveBeenCalledWith('project123', 'user123', 'user456', 50);
    });

    it('should handle limit parameter', async () => {
      mockCommunicationService.getConversation.mockResolvedValue([]);

      await request(app)
        .get('/api/messages/conversation/project123/user456?limit=20')
        .expect(200);

      expect(mockCommunicationService.getConversation).toHaveBeenCalledWith('project123', 'user123', 'user456', 20);
    });
  });

  describe('PATCH /api/messages/:messageId/read', () => {
    it('should mark message as read', async () => {
      mockCommunicationService.markMessageAsRead.mockResolvedValue();

      const response = await request(app)
        .patch('/api/messages/msg123/read')
        .send({ projectId: 'project123' })
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Message marked as read'
      });

      expect(mockCommunicationService.markMessageAsRead).toHaveBeenCalledWith('msg123', 'project123', 'user123');
    });

    it('should require projectId', async () => {
      const response = await request(app)
        .patch('/api/messages/msg123/read')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Project ID is required'
      });
    });

    it('should handle service errors', async () => {
      mockCommunicationService.markMessageAsRead.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .patch('/api/messages/msg123/read')
        .send({ projectId: 'project123' })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to mark message as read'
      });
    });
  });

  describe('GET /api/messages/unread-count', () => {
    it('should get unread message count', async () => {
      mockCommunicationService.getUnreadMessageCount.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/messages/unread-count')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: { count: 5 }
      });

      expect(mockCommunicationService.getUnreadMessageCount).toHaveBeenCalledWith('user123');
    });

    it('should handle service errors', async () => {
      mockCommunicationService.getUnreadMessageCount.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/messages/unread-count')
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to get unread message count'
      });
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

      mockCommunicationService.sendClarificationRequest.mockResolvedValue(mockMessage as any);

      const response = await request(app)
        .post('/api/messages/clarification')
        .send(requestData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockMessage
      });

      expect(mockCommunicationService.sendClarificationRequest).toHaveBeenCalledWith(
        'project123',
        'user123',
        'What type of foundation is required?'
      );
    });

    it('should require projectId and question', async () => {
      const response = await request(app)
        .post('/api/messages/clarification')
        .send({ projectId: 'project123' })
        .expect(400);

      expect(response.body).toEqual({
        success: false,
        error: 'Project ID and question are required'
      });
    });

    it('should handle service errors', async () => {
      mockCommunicationService.sendClarificationRequest.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/messages/clarification')
        .send({
          projectId: 'project123',
          question: 'What type of foundation?'
        })
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        error: 'Failed to send clarification request'
      });
    });
  });
});