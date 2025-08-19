import { Router, Request, Response } from 'express';
import { AuthService } from '../services/AuthService';
import { UserModel } from '../models/User';
import { validateRequest, userValidationSchemas } from '../middleware/validation';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();
const authService = new AuthService();

// Register new user
router.post('/register', 
  validateRequest({ body: userValidationSchemas.register }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, tokens } = await authService.register(req.body);
      const sanitizedUser = UserModel.sanitizeForResponse(user);

      res.status(201).json({
        success: true,
        data: {
          user: sanitizedUser,
          tokens,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Registration failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      const statusCode = errorMessage.includes('already exists') ? 409 : 400;

      res.status(statusCode).json({
        success: false,
        error: {
          code: statusCode === 409 ? 'USER_EXISTS' : 'REGISTRATION_FAILED',
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

// Login user
router.post('/login',
  validateRequest({ body: userValidationSchemas.login }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { user, tokens } = await authService.login(req.body);
      const sanitizedUser = UserModel.sanitizeForResponse(user);

      res.json({
        success: true,
        data: {
          user: sanitizedUser,
          tokens,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Login failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Login failed';

      res.status(401).json({
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

// Refresh access token
router.post('/refresh',
  validateRequest({ body: userValidationSchemas.refreshToken }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tokens = await authService.refreshToken(req.body.refreshToken);

      res.json({
        success: true,
        data: { tokens },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Token refresh failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';

      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

// Logout user
router.post('/logout',
  validateRequest({ body: userValidationSchemas.refreshToken }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      await authService.logout(req.body.refreshToken);

      res.json({
        success: true,
        data: { message: 'Logged out successfully' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Logout failed:', error);
      
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Logout failed',
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

// Change password
router.post('/change-password',
  authenticateToken,
  validateRequest({ body: userValidationSchemas.changePassword }),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
        return;
      }

      await authService.changePassword(
        req.user.userId,
        req.body.currentPassword,
        req.body.newPassword
      );

      res.json({
        success: true,
        data: { message: 'Password changed successfully' },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Password change failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Password change failed';
      const statusCode = errorMessage.includes('incorrect') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

// Get current user profile
router.get('/me',
  authenticateToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
        return;
      }

      const userService = new (await import('../services/UserService')).UserService();
      const user = await userService.getUserById(req.user.userId);

      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        });
        return;
      }

      const sanitizedUser = UserModel.sanitizeForResponse(user);

      res.json({
        success: true,
        data: { user: sanitizedUser },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    } catch (error) {
      logger.error('Get current user failed:', error);
      
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to retrieve user profile',
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown',
      });
    }
  }
);

export default router;