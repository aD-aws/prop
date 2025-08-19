import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, requireRole, AuthenticatedRequest } from '../../middleware/auth';
import { config } from '../../config';

jest.mock('jsonwebtoken');
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe('Auth Middleware', () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  const mockJwt = jwt as jest.Mocked<typeof jwt>;

  beforeEach(() => {
    mockRequest = {
      headers: {
        'x-request-id': 'test-request-id',
      },
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('authenticateToken', () => {
    it('should authenticate valid token', () => {
      const mockPayload = {
        userId: '123',
        email: 'test@example.com',
        userType: 'homeowner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockRequest.headers = {
        authorization: 'Bearer validtoken',
        'x-request-id': 'test-request-id',
      };

      (mockJwt.verify as jest.Mock).mockReturnValueOnce(mockPayload);

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', () => {
      mockRequest.headers = { 'x-request-id': 'test-request-id' };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalidtoken',
        'x-request-id': 'test-request-id',
      };

      (mockJwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new jwt.JsonWebTokenError('invalid token');
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MALFORMED_TOKEN',
          message: 'Malformed access token',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject expired token', () => {
      mockRequest.headers = {
        authorization: 'Bearer expiredtoken',
        'x-request-id': 'test-request-id',
      };

      (mockJwt.verify as jest.Mock).mockImplementationOnce(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle missing authorization header', () => {
      mockRequest.headers = { 'x-request-id': 'test-request-id' };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });

    it('should handle malformed authorization header', () => {
      mockRequest.headers = {
        authorization: 'InvalidFormat',
        'x-request-id': 'test-request-id',
      };

      authenticateToken(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
    });
  });

  describe('requireRole', () => {
    it('should allow access for authorized role', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        userType: 'admin',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const middleware = requireRole(['admin', 'builder']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });

    it('should deny access for unauthorized role', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        userType: 'homeowner',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const middleware = requireRole(['admin', 'builder']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'Insufficient permissions for this operation',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should deny access when user is not authenticated', () => {
      mockRequest.user = undefined;

      const middleware = requireRole(['admin']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: expect.any(String),
        requestId: 'test-request-id',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should allow access for multiple valid roles', () => {
      mockRequest.user = {
        userId: '123',
        email: 'test@example.com',
        userType: 'builder',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      const middleware = requireRole(['admin', 'builder']);
      middleware(mockRequest as AuthenticatedRequest, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockResponse.status).not.toHaveBeenCalled();
    });
  });
});