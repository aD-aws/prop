import { WebSocketService } from '../../services/WebSocketService';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';

// Mock dependencies
jest.mock('ws');
jest.mock('jsonwebtoken');

describe('WebSocketService', () => {
  let webSocketService: WebSocketService;
  let mockWss: jest.Mocked<WebSocketServer>;
  let mockWs: jest.Mocked<WebSocket>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockWs = {
      readyState: WebSocket.OPEN,
      send: jest.fn(),
      ping: jest.fn(),
      terminate: jest.fn(),
      on: jest.fn(),
      userId: 'user123',
      isAlive: true
    } as any;

    mockWss = {
      on: jest.fn(),
      clients: new Set([mockWs]),
      close: jest.fn()
    } as any;

    (WebSocketServer as jest.Mock).mockReturnValue(mockWss);
    
    webSocketService = new WebSocketService();
  });

  describe('initialize', () => {
    it('should initialize WebSocket server', () => {
      const mockServer = {};
      
      webSocketService.initialize(mockServer);

      expect(WebSocketServer).toHaveBeenCalledWith({
        server: mockServer,
        path: '/ws',
        verifyClient: expect.any(Function)
      });

      expect(mockWss.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });
  });

  describe('verifyClient', () => {
    it('should verify client with valid token', () => {
      const mockReq = { url: '/?token=valid-token' } as any;
      const info = { req: mockReq } as any;

      (jwt.verify as jest.Mock).mockReturnValue({ userId: 'user123' });

      // Get the verifyClient function
      const verifyClientCall = (WebSocketServer as jest.Mock).mock.calls[0][0];
      const verifyClient = verifyClientCall.verifyClient;

      const result = verifyClient(info);

      expect(result).toBe(true);
      expect(jwt.verify).toHaveBeenCalledWith('valid-token', expect.any(String));
      expect(mockReq.userId).toBe('user123');
    });

    it('should reject client with no token', () => {
      const mockReq = { url: '/' } as any;
      const info = { req: mockReq } as any;

      const verifyClientCall = (WebSocketServer as jest.Mock).mock.calls[0][0];
      const verifyClient = verifyClientCall.verifyClient;

      const result = verifyClient(info);

      expect(result).toBe(false);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should reject client with invalid token', () => {
      const mockReq = { url: '/?token=invalid-token' } as any;
      const info = { req: mockReq } as any;

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const verifyClientCall = (WebSocketServer as jest.Mock).mock.calls[0][0];
      const verifyClient = verifyClientCall.verifyClient;

      const result = verifyClient(info);

      expect(result).toBe(false);
    });
  });

  describe('sendToUser', () => {
    beforeEach(() => {
      // Initialize the service to set up clients map
      webSocketService.initialize({});
      
      // Simulate connection handling
      const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === 'connection')[1];
      const mockReq = { userId: 'user123' } as any;
      connectionHandler(mockWs, mockReq);
    });

    it('should send message to user', async () => {
      const message = {
        type: 'notification',
        data: { title: 'Test', message: 'Test message' }
      };

      mockWs.send.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      await webSocketService.sendToUser('user123', message);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          ...message,
          timestamp: expect.any(String)
        }),
        expect.any(Function)
      );
    });

    it('should handle user with no connections', async () => {
      const message = {
        type: 'notification',
        data: { title: 'Test', message: 'Test message' }
      };

      await expect(webSocketService.sendToUser('nonexistent-user', message))
        .resolves.not.toThrow();
    });

    it('should handle send error', async () => {
      const message = {
        type: 'notification',
        data: { title: 'Test', message: 'Test message' }
      };

      mockWs.send.mockImplementation((data, callback) => {
        if (callback) callback(new Error('Send failed'));
      });

      await expect(webSocketService.sendToUser('user123', message))
        .resolves.not.toThrow();
    });
  });

  describe('sendToProject', () => {
    beforeEach(() => {
      webSocketService.initialize({});
      
      // Set up a client with project subscription
      const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === 'connection')[1];
      const mockReq = { userId: 'user123' } as any;
      
      // Mock subscription
      (mockWs as any).subscriptions = new Set(['project:project123']);
      
      connectionHandler(mockWs, mockReq);
    });

    it('should send message to project subscribers', async () => {
      const message = {
        type: 'project_update',
        data: { projectId: 'project123', status: 'updated' }
      };

      mockWs.send.mockImplementation((data, callback) => {
        if (callback) callback();
      });

      await webSocketService.sendToProject('project123', message);

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          ...message,
          timestamp: expect.any(String)
        }),
        expect.any(Function)
      );
    });

    it('should not send to non-subscribers', async () => {
      // Remove subscription
      (mockWs as any).subscriptions = new Set();

      const message = {
        type: 'project_update',
        data: { projectId: 'project123', status: 'updated' }
      };

      await webSocketService.sendToProject('project123', message);

      expect(mockWs.send).not.toHaveBeenCalled();
    });
  });

  describe('getConnectedUsers', () => {
    beforeEach(() => {
      webSocketService.initialize({});
      
      const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === 'connection')[1];
      const mockReq = { userId: 'user123' } as any;
      connectionHandler(mockWs, mockReq);
    });

    it('should return list of connected users', () => {
      const users = webSocketService.getConnectedUsers();
      expect(users).toEqual(['user123']);
    });
  });

  describe('getUserConnectionCount', () => {
    beforeEach(() => {
      webSocketService.initialize({});
      
      const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === 'connection')[1];
      const mockReq = { userId: 'user123' } as any;
      connectionHandler(mockWs, mockReq);
    });

    it('should return connection count for user', () => {
      const count = webSocketService.getUserConnectionCount('user123');
      expect(count).toBe(1);
    });

    it('should return 0 for non-connected user', () => {
      const count = webSocketService.getUserConnectionCount('nonexistent');
      expect(count).toBe(0);
    });
  });

  describe('close', () => {
    it('should close WebSocket server and clear clients', () => {
      webSocketService.initialize({});
      
      webSocketService.close();

      expect(mockWss.close).toHaveBeenCalled();
      expect(webSocketService.getConnectedUsers()).toEqual([]);
    });
  });

  describe('message handling', () => {
    let messageHandler: (data: Buffer) => void;

    beforeEach(() => {
      webSocketService.initialize({});
      
      const connectionHandler = mockWss.on.mock.calls.find(call => call[0] === 'connection')[1];
      const mockReq = { userId: 'user123' } as any;
      connectionHandler(mockWs, mockReq);

      // Get the message handler
      messageHandler = mockWs.on.mock.calls.find(call => call[0] === 'message')[1];
    });

    it('should handle ping message', () => {
      const pingMessage = JSON.stringify({ type: 'ping', data: {} });
      
      messageHandler(Buffer.from(pingMessage));

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'pong', data: {} }),
        expect.any(Function)
      );
    });

    it('should handle subscribe message', () => {
      const subscribeMessage = JSON.stringify({
        type: 'subscribe',
        data: { channel: 'project', projectId: 'project123' }
      });
      
      messageHandler(Buffer.from(subscribeMessage));

      expect((mockWs as any).subscriptions.has('project:project123')).toBe(true);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribed',
          data: { channel: 'project', projectId: 'project123' }
        }),
        expect.any(Function)
      );
    });

    it('should handle unsubscribe message', () => {
      // First subscribe
      (mockWs as any).subscriptions = new Set(['project:project123']);
      
      const unsubscribeMessage = JSON.stringify({
        type: 'unsubscribe',
        data: { channel: 'project', projectId: 'project123' }
      });
      
      messageHandler(Buffer.from(unsubscribeMessage));

      expect((mockWs as any).subscriptions.has('project:project123')).toBe(false);
      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscribed',
          data: { channel: 'project', projectId: 'project123' }
        }),
        expect.any(Function)
      );
    });

    it('should handle invalid JSON', () => {
      const invalidMessage = 'invalid json';
      
      messageHandler(Buffer.from(invalidMessage));

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Invalid message format' }
        }),
        expect.any(Function)
      );
    });

    it('should handle unknown message type', () => {
      const unknownMessage = JSON.stringify({ type: 'unknown', data: {} });
      
      messageHandler(Buffer.from(unknownMessage));

      expect(mockWs.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'error',
          data: { message: 'Unknown message type' }
        }),
        expect.any(Function)
      );
    });
  });
});