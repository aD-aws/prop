import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    user: (req as any).user?.userId,
  });

  // Default error response
  let statusCode = error.statusCode || 500;
  let errorCode = error.code || 'INTERNAL_SERVER_ERROR';
  let errorMessage = error.message || 'An unexpected error occurred';

  // Handle specific AWS SDK errors
  if (error.name === 'ResourceNotFoundException') {
    statusCode = 404;
    errorCode = 'RESOURCE_NOT_FOUND';
    errorMessage = 'The requested resource was not found';
  } else if (error.name === 'ConditionalCheckFailedException') {
    statusCode = 409;
    errorCode = 'CONFLICT';
    errorMessage = 'The operation conflicts with the current state of the resource';
  } else if (error.name === 'ValidationException') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = 'Invalid request parameters';
  } else if (error.name === 'AccessDeniedException') {
    statusCode = 403;
    errorCode = 'ACCESS_DENIED';
    errorMessage = 'Access denied to the requested resource';
  } else if (error.name === 'ThrottlingException') {
    statusCode = 429;
    errorCode = 'RATE_LIMIT_EXCEEDED';
    errorMessage = 'Rate limit exceeded, please try again later';
  }

  // Don't expose internal errors in production
  if (statusCode === 500 && process.env.NODE_ENV === 'production') {
    errorMessage = 'An unexpected error occurred';
    delete error.details;
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage,
      ...(error.details && { details: error.details }),
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'] || 'unknown',
  });
};