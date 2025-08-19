import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis } from './config/redis';
import { WebSocketService } from './services/WebSocketService';

const startServer = async (): Promise<void> => {
  try {
    // Connect to Redis
    await connectRedis();
    
    // Start the server
    const server = app.listen(config.server.port, () => {
      logger.info(`Server started on port ${config.server.port}`, {
        environment: config.server.nodeEnv,
        port: config.server.port,
      });
    });

    // Initialize WebSocket server
    const webSocketService = new WebSocketService();
    webSocketService.initialize(server);

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          // Close WebSocket server
          webSocketService.close();
          
          // Close Redis connection
          const { disconnectRedis } = await import('./config/redis');
          await disconnectRedis();
          
          logger.info('All connections closed, exiting process');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();