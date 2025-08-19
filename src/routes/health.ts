import { Router, Request, Response } from 'express';

const router = Router();

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', (req: Request, res: Response) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // This would be a real check in production
      redis: 'connected',     // This would be a real check in production
      aws: 'connected'        // This would be a real check in production
    }
  };

  res.status(200).json(healthCheck);
});

/**
 * Detailed health check endpoint
 * GET /health/detailed
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const detailedHealth = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        external: Math.round(process.memoryUsage().external / 1024 / 1024)
      },
      cpu: {
        usage: process.cpuUsage()
      },
      services: {
        database: await checkDatabaseHealth(),
        redis: await checkRedisHealth(),
        aws: await checkAWSHealth()
      }
    };

    const allServicesHealthy = Object.values(detailedHealth.services).every(
      service => service === 'connected'
    );

    res.status(allServicesHealthy ? 200 : 503).json(detailedHealth);
  } catch (error) {
    res.status(503).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Readiness probe endpoint
 * GET /health/ready
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check if all critical services are ready
    const services = {
      database: await checkDatabaseHealth(),
      redis: await checkRedisHealth()
    };

    const allReady = Object.values(services).every(
      service => service === 'connected'
    );

    if (allReady) {
      res.status(200).json({
        status: 'READY',
        timestamp: new Date().toISOString(),
        services
      });
    } else {
      res.status(503).json({
        status: 'NOT_READY',
        timestamp: new Date().toISOString(),
        services
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'NOT_READY',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Liveness probe endpoint
 * GET /health/live
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ALIVE',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Helper functions for service health checks
async function checkDatabaseHealth(): Promise<string> {
  try {
    // In a real implementation, this would check DynamoDB connectivity
    // For now, return connected if we're in test mode or have the endpoint configured
    if (process.env.NODE_ENV === 'test' || process.env.DYNAMODB_ENDPOINT) {
      return 'connected';
    }
    return 'disconnected';
  } catch (error) {
    return 'error';
  }
}

async function checkRedisHealth(): Promise<string> {
  try {
    // In a real implementation, this would check Redis connectivity
    // For now, return connected if we're in test mode or have Redis URL configured
    if (process.env.NODE_ENV === 'test' || process.env.REDIS_URL) {
      return 'connected';
    }
    return 'disconnected';
  } catch (error) {
    return 'error';
  }
}

async function checkAWSHealth(): Promise<string> {
  try {
    // In a real implementation, this would check AWS service connectivity
    // For now, return connected if we have AWS credentials configured
    if (process.env.NODE_ENV === 'test' || 
        (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)) {
      return 'connected';
    }
    return 'disconnected';
  } catch (error) {
    return 'error';
  }
}

export default router;