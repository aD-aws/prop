import request from 'supertest';
import express from 'express';
import authRoutes from '../../routes/auth';
import { AuthService } from '../../services/AuthService';
import { UserService } from '../../services/UserService';

// Mock services
jest.mock('../../services/AuthService');
jest.mock('../../services/UserService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  req.headers['x-request-id'] = 'test-request-id';
  next();
});
app.use('/auth', authRoutes);

describe('Auth Routes', () => {
  const mockAuthService = AuthService as jest.MockedClass<typeof AuthService>;
  const mockUserService = UserService as jest.MockedClass<typeof UserService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    const validRegisterData = {
      email: 'test@example.com',
      password: 'Password123!',
      userType: 'homeowner',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
      gdprConsent: true,
    };

    const mockUser = {
      PK: 'USER#123',
      SK: 'PROFILE',
      id: '123',
      email: 'test@example.com',
      userType: 'homeowner' as const,
      profile: validRegisterData.profile,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      gdprConsent: true,
      emailVerified: false,
      GSI1PK: 'test@example.com',
      GSI1SK: 'homeowner',
    };

    const mockTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    };

    it('should register user successfully', async () => {
      mockAuthService.prototype.register.mockResolvedValueOnce({
        user: mockUser,
        tokens: mockTokens,
      });

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBe('access-token');
    });

    it('should return 400 for invalid email', async () => {
      const invalidData = { ...validRegisterData, email: 'invalid-email' };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const invalidData = { ...validRegisterData, password: 'weak' };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing GDPR consent', async () => {
      const invalidData = { ...validRegisterData, gdprConsent: false };

      const response = await request(app)
        .post('/auth/register')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 for existing user', async () => {
      mockAuthService.prototype.register.mockRejectedValueOnce(
        new Error('User with this email already exists')
      );

      const response = await request(app)
        .post('/auth/register')
        .send(validRegisterData);

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('USER_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: '123',
      email: 'test@example.com',
      userType: 'homeowner' as const,
      profile: { firstName: 'John', lastName: 'Doe' },
    };

    const mockTokens = {
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 3600,
    };

    it('should login user successfully', async () => {
      mockAuthService.prototype.login.mockResolvedValueOnce({
        user: mockUser as any,
        tokens: mockTokens,
      });

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.tokens.accessToken).toBe('access-token');
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.prototype.login.mockRejectedValueOnce(
        new Error('Invalid email or password')
      );

      const response = await request(app)
        .post('/auth/login')
        .send(validLoginData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOGIN_FAILED');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = { ...validLoginData, email: 'invalid-email' };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for missing password', async () => {
      const invalidData = { email: 'test@example.com' };

      const response = await request(app)
        .post('/auth/login')
        .send(invalidData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/refresh', () => {
    const validRefreshData = {
      refreshToken: 'valid-refresh-token',
    };

    const mockTokens = {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresIn: 3600,
    };

    it('should refresh token successfully', async () => {
      mockAuthService.prototype.refreshToken.mockResolvedValueOnce(mockTokens);

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens.accessToken).toBe('new-access-token');
    });

    it('should return 401 for invalid refresh token', async () => {
      mockAuthService.prototype.refreshToken.mockRejectedValueOnce(
        new Error('Invalid refresh token')
      );

      const response = await request(app)
        .post('/auth/refresh')
        .send(validRefreshData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('TOKEN_REFRESH_FAILED');
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /auth/logout', () => {
    const validLogoutData = {
      refreshToken: 'valid-refresh-token',
    };

    it('should logout successfully', async () => {
      mockAuthService.prototype.logout.mockResolvedValueOnce(undefined);

      const response = await request(app)
        .post('/auth/logout')
        .send(validLogoutData);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Logged out successfully');
    });

    it('should return 400 for logout failure', async () => {
      mockAuthService.prototype.logout.mockRejectedValueOnce(
        new Error('Logout failed')
      );

      const response = await request(app)
        .post('/auth/logout')
        .send(validLogoutData);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LOGOUT_FAILED');
    });
  });
});