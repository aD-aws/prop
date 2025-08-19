import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  isAlive?: boolean;
  subscriptions?: Set<string>;
}

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: string;
}

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Map<string, Set<AuthenticatedWebSocket>> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  initialize(server: any): void {
    this.wss = new WebSocketServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    logger.info('WebSocket server initialized');
  }

  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      const url = parse(info.req.url || '', true);
      const token = url.query.token as string;

      if (!token) {
        logger.warn('WebSocket connection rejected: No token provided');
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;
      
      // Store userId in request for later use
      (info.req as any).userId = decoded.userId;
      
      return true;
    } catch (error) {
      logger.warn('WebSocket connection rejected: Invalid token', error);
      return false;
    }
  }

  private handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): void {
    const userId = (req as any).userId;
    ws.userId = userId;
    ws.isAlive = true;

    // Add client to user's connection set
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId)!.add(ws);

    logger.info(`WebSocket client connected: ${userId}`);

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString()) as WebSocketMessage;
        this.handleMessage(ws, message);
      } catch (error) {
        logger.error('Failed to parse WebSocket message:', error);
        this.sendError(ws, 'Invalid message format');
      }
    });

    // Handle client disconnect
    ws.on('close', () => {
      this.handleDisconnection(ws);
    });

    ws.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.handleDisconnection(ws);
    });

    // Send welcome message
    this.sendToClient(ws, {
      type: 'connected',
      data: { message: 'WebSocket connection established' }
    });
  }

  private handleMessage(ws: AuthenticatedWebSocket, message: WebSocketMessage): void {
    try {
      switch (message.type) {
        case 'ping':
          this.sendToClient(ws, { type: 'pong', data: {} });
          break;
        
        case 'subscribe':
          this.handleSubscription(ws, message.data);
          break;
        
        case 'unsubscribe':
          this.handleUnsubscription(ws, message.data);
          break;
        
        default:
          logger.warn(`Unknown WebSocket message type: ${message.type}`);
          this.sendError(ws, 'Unknown message type');
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', error);
      this.sendError(ws, 'Internal server error');
    }
  }

  private handleSubscription(ws: AuthenticatedWebSocket, data: any): void {
    // Handle subscription to specific channels (e.g., project updates)
    const { channel, projectId } = data;
    
    if (channel === 'project' && projectId) {
      // Store subscription info on the WebSocket
      if (!ws.subscriptions) {
        ws.subscriptions = new Set();
      }
      ws.subscriptions.add(`project:${projectId}`);
      
      this.sendToClient(ws, {
        type: 'subscribed',
        data: { channel, projectId }
      });
      
      logger.info(`Client ${ws.userId} subscribed to project:${projectId}`);
    }
  }

  private handleUnsubscription(ws: AuthenticatedWebSocket, data: any): void {
    const { channel, projectId } = data;
    
    if (channel === 'project' && projectId && ws.subscriptions) {
      ws.subscriptions.delete(`project:${projectId}`);
      
      this.sendToClient(ws, {
        type: 'unsubscribed',
        data: { channel, projectId }
      });
      
      logger.info(`Client ${ws.userId} unsubscribed from project:${projectId}`);
    }
  }

  private handleDisconnection(ws: AuthenticatedWebSocket): void {
    if (ws.userId) {
      const userClients = this.clients.get(ws.userId);
      if (userClients) {
        userClients.delete(ws);
        if (userClients.size === 0) {
          this.clients.delete(ws.userId);
        }
      }
      logger.info(`WebSocket client disconnected: ${ws.userId}`);
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.wss) return;

      this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
        if (!ws.isAlive) {
          ws.terminate();
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds
  }

  async sendToUser(userId: string, message: WebSocketMessage): Promise<void> {
    const userClients = this.clients.get(userId);
    if (!userClients || userClients.size === 0) {
      logger.debug(`No WebSocket clients found for user: ${userId}`);
      return;
    }

    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    const promises = Array.from(userClients).map(client => 
      this.sendToClient(client, messageWithTimestamp)
    );

    await Promise.allSettled(promises);
  }

  async sendToProject(projectId: string, message: WebSocketMessage): Promise<void> {
    if (!this.wss) return;

    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString()
    };

    const promises: Promise<void>[] = [];

    this.wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.subscriptions && ws.subscriptions.has(`project:${projectId}`)) {
        promises.push(this.sendToClient(ws, messageWithTimestamp));
      }
    });

    await Promise.allSettled(promises);
  }

  private async sendToClient(ws: AuthenticatedWebSocket, message: WebSocketMessage): Promise<void> {
    return new Promise((resolve, reject) => {
      if (ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }

      try {
        ws.send(JSON.stringify(message), (error) => {
          if (error) {
            logger.error('Failed to send WebSocket message:', error);
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        logger.error('Error sending WebSocket message:', error);
        reject(error);
      }
    });
  }

  private sendError(ws: AuthenticatedWebSocket, message: string): void {
    this.sendToClient(ws, {
      type: 'error',
      data: { message }
    }).catch(error => {
      logger.error('Failed to send error message:', error);
    });
  }

  getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  getUserConnectionCount(userId: string): number {
    return this.clients.get(userId)?.size || 0;
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    logger.info('WebSocket server closed');
  }
}