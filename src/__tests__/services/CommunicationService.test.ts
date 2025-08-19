import { CommunicationService } from '../../services/CommunicationService';
import { NotificationService } from '../../services/NotificationService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock AWS clients and services
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');
jest.mock('../../services/NotificationService');

describe('CommunicationService', () => {
  let communicationService: CommunicationService;
  let mockDynamoClient: jest.Mocked<DynamoDBDocumentClient>;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDynamoClient = {
      send: jest.fn().mockResolvedValue({})
    } as any;

    mockNotificationService = {
      sendNotification: jest.fn().mockResolvedValue({})
    } as any;

    // Mock the constructors
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDynamoClient);
    (NotificationService as jest.Mock).mockReturnValue(mockNotificationService);

    communicationService = new CommunicationService();
  });

  describe('sendMessage', () => {
    const messageData = {
      projectId: 'project123',
      senderId: 'user1',
      recipientId: 'user2',
      subject: 'Test Subject',
      content: 'Test message content'
    };

    it('should send message successfully', async () => {
      // Mock project access validation for sender
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock project access validation for recipient
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock message creation
      mockDynamoClient.send.mockResolvedValueOnce({});

      // Mock sender details for notification
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: {
          profile: { firstName: 'John', lastName: 'Doe' }
        }
      });

      mockNotificationService.sendNotification.mockResolvedValueOnce({} as any);

      const result = await communicationService.sendMessage(messageData);

      expect(result).toBeDefined();
      expect(result.projectId).toBe('project123');
      expect(result.senderId).toBe('user1');
      expect(result.recipientId).toBe('user2');
      expect(result.content).toBe('Test message content');
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(4);
      expect(mockNotificationService.sendNotification).toHaveBeenCalledTimes(1);
    });

    it('should validate project access for sender', async () => {
      // Mock project not found
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: null
      });

      await expect(communicationService.sendMessage(messageData))
        .rejects.toThrow('Project not found');
    });

    it('should validate project access for recipient', async () => {
      // Mock project access validation for sender (success)
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock project access validation for recipient (failure)
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock no quote for recipient
      mockDynamoClient.send.mockResolvedValueOnce({
        Count: 0
      });

      await expect(communicationService.sendMessage({
        ...messageData,
        recipientId: 'user3' // Different user
      })).rejects.toThrow('User does not have access to this project');
    });
  });

  describe('getProjectMessages', () => {
    it('should retrieve project messages', async () => {
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

      // Mock project access validation
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock messages query
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockMessages,
        LastEvaluatedKey: undefined
      });

      const result = await communicationService.getProjectMessages('project123', 'user1', 50);

      expect(result.messages).toEqual(mockMessages);
      expect(result.lastKey).toBeUndefined();
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(2);
    });

    it('should validate user access to project', async () => {
      // Mock project not found
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: null
      });

      await expect(communicationService.getProjectMessages('project123', 'user1'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('getUserMessages', () => {
    it('should retrieve user messages', async () => {
      const mockMessages = [
        {
          id: 'msg1',
          recipientId: 'user1',
          senderId: 'user2',
          content: 'Hello',
          createdAt: '2024-01-01T00:00:00Z'
        }
      ];

      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockMessages,
        LastEvaluatedKey: undefined
      });

      const result = await communicationService.getUserMessages('user1', 50);

      expect(result.messages).toEqual(mockMessages);
      expect(result.lastKey).toBeUndefined();
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          IndexName: 'GSI3',
          KeyConditionExpression: 'GSI3PK = :userId'
        })
      );
    });
  });

  describe('markMessageAsRead', () => {
    it('should mark message as read', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({});

      await communicationService.markMessageAsRead('msg123', 'project123', 'user1');

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          UpdateExpression: 'SET isRead = :isRead, readAt = :readAt',
          ConditionExpression: 'recipientId = :userId'
        })
      );
    });
  });

  describe('getUnreadMessageCount', () => {
    it('should return unread message count', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Count: 5
      });

      const count = await communicationService.getUnreadMessageCount('user1');

      expect(count).toBe(5);
      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          FilterExpression: 'isRead = :isRead',
          Select: 'COUNT'
        })
      );
    });

    it('should return 0 on error', async () => {
      mockDynamoClient.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      const count = await communicationService.getUnreadMessageCount('user1');

      expect(count).toBe(0);
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation between two users', async () => {
      const mockMessages = [
        {
          id: 'msg1',
          projectId: 'project123',
          senderId: 'user1',
          recipientId: 'user2',
          content: 'Hello',
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'msg2',
          projectId: 'project123',
          senderId: 'user2',
          recipientId: 'user1',
          content: 'Hi there',
          createdAt: '2024-01-01T01:00:00Z'
        }
      ];

      // Mock project access validation for user1
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock project access validation for user2
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: { ownerId: 'user1', id: 'project123' }
      });

      // Mock conversation query
      mockDynamoClient.send.mockResolvedValueOnce({
        Items: mockMessages
      });

      const result = await communicationService.getConversation('project123', 'user1', 'user2', 50);

      expect(result).toEqual(mockMessages);
      expect(mockDynamoClient.send).toHaveBeenCalledTimes(3);
      expect(mockDynamoClient.send).toHaveBeenLastCalledWith(
        expect.objectContaining({
          FilterExpression: '(senderId = :user1 AND recipientId = :user2) OR (senderId = :user2 AND recipientId = :user1)'
        })
      );
    });
  });

  describe('sendClarificationRequest', () => {
    it('should send clarification request from builder to homeowner', async () => {
      const mockProject = {
        ownerId: 'homeowner1',
        id: 'project123'
      };

      // Mock get project
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockProject
      });

      // Mock sendMessage
      const sendMessageSpy = jest.spyOn(communicationService, 'sendMessage')
        .mockResolvedValueOnce({} as any);

      await communicationService.sendClarificationRequest('project123', 'builder1', 'What type of foundation?');

      expect(mockDynamoClient.send).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: {
            PK: 'PROJECT#project123',
            SK: 'METADATA'
          }
        })
      );

      expect(sendMessageSpy).toHaveBeenCalledWith({
        projectId: 'project123',
        senderId: 'builder1',
        recipientId: 'homeowner1',
        subject: 'Clarification Request',
        content: 'What type of foundation?'
      });

      sendMessageSpy.mockRestore();
    });

    it('should throw error if project not found', async () => {
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: null
      });

      await expect(communicationService.sendClarificationRequest('project123', 'builder1', 'Question?'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('sendQuoteSubmissionNotification', () => {
    it('should send quote submission notification', async () => {
      const mockProject = {
        ownerId: 'homeowner1',
        id: 'project123'
      };

      const mockBuilder = {
        profile: { firstName: 'Bob', lastName: 'Builder' }
      };

      // Mock get project
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockProject
      });

      // Mock get builder
      mockDynamoClient.send.mockResolvedValueOnce({
        Item: mockBuilder
      });

      // Mock sendMessage
      const sendMessageSpy = jest.spyOn(communicationService, 'sendMessage')
        .mockResolvedValueOnce({} as any);

      await communicationService.sendQuoteSubmissionNotification('project123', 'builder1');

      expect(sendMessageSpy).toHaveBeenCalledWith({
        projectId: 'project123',
        senderId: 'builder1',
        recipientId: 'homeowner1',
        subject: 'Quote Submitted',
        content: 'Bob Builder has submitted a quote for your project. You can review it in your dashboard.'
      });

      sendMessageSpy.mockRestore();
    });
  });
});