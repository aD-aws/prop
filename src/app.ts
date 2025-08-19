import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.server.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
}));

// Request parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    requestId: req.headers['x-request-id'],
  });
  next();
});

// Health check routes
import healthRoutes from './routes/health';
app.use('/health', healthRoutes);

// Legacy health check endpoint for backward compatibility
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
  });
});

// API routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import propertyRoutes from './routes/property';
import projectRoutes from './routes/projects';
import documentRoutes from './routes/documents';
import complianceRoutes from './routes/compliance';
import costEstimationRoutes from './routes/cost-estimation';
import sowRoutes from './routes/sow';
import quotesRoutes from './routes/quotes';
import contractRoutes from './routes/contracts';
import notificationRoutes from './routes/notifications';
import messageRoutes from './routes/messages';

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/property', propertyRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/cost', costEstimationRoutes);
app.use('/api/sow', sowRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;