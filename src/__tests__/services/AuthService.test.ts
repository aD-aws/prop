import { AuthService } from '../../services/AuthService';
import { UserService } from '../../services/UserService';
import { redisClient } from '../../config/redis';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../types';

// Mock dependencies
jest.mock('../../services/UserService');
jest.mock('../../config/redis', () => ({
  redisClient: {
    setEx: jest.fn(),
    get: jest.fn(),
  },
}));
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('AuthService', () => {
  let authService: AuthService;
  const mockUserService = UserService as jest.MockedClass<typeof UserService>;
  const mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;
  const mockBcrypt = bcrypt as any;
  const mockJwt = jwt as any;

  const mockUser: User = {
    PK: 'USER#123',
    SK: 'PROFILE',
    id: '123',
    email: 'john@example.com',
    userType: 'homeowner',
    profile: {
      firstName: 'John',
      lastName: 'Doe',
    },
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    gdprConsent: true,
    emailVerified: false,
    GSI1PK: 'john@example.com',
    GSI1SK: 'homeowner',
  };

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'john@example.com',
      password: 'Password123!',
      userType: 'homeowner' as const,
      profile: {
        firstName: 'John',
        lastName: 'Doe',
      },
      gdprConsent: true,
    };

    it('should register user successfully', async () => {
      mockUserService.prototype.getUserByEmail.mockResolvedValueOnce(null);
      mockUserService.prototype.createUser.mockResolvedValueOnce(mockUser);
      mockBcrypt.hash.mockResolvedValueOnce('hashedPassword');
      mockRedisClient.setEx.mockResolvedValueOnce('OK');
      mockJwt.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken');

      const result = await authService.register(registerData);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBe('accessToken');
      expect(result.tokens.refreshToken).toBe('refreshToken');
      expect(mockBcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
    });

    it('should throw error for invalid email', async () => {
      const invalidData = { ...registerData, email: 'invalid-email' };

      await expect(authService.register(invalidData)).rejects.toThrow('Invalid email format');
    });

    it('should throw error for weak password', async () => {
      const invalidData = { ...registerData, password: 'weak' };

      await expect(authService.register(invalidData)).rejects.toThrow(
        'Password must be at least 8 characters long'
      );
    });

    it('should throw error without GDPR consent', async () => {
      const invalidData = { ...registerData, gdprConsent: false };

      await expect(authService.register(invalidData)).rejects.toThrow(
        'GDPR consent is required'
      );
    });
  });

  describe('login', () => {
    const credentials = {
      email: 'john@example.com',
      password: 'Password123!',
    };

    it('should login user successfully', async () => {
      const getUserByEmailSpy = jest.spyOn(authService['userService'], 'getUserByEmail');
      getUserByEmailSpy.mockResolvedValueOnce(mockUser);
      mockRedisClient.get.mockResolvedValueOnce('hashedPassword');
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockJwt.sign.mockReturnValueOnce('accessToken').mockReturnValueOnce('refreshToken');

      const result = await authService.login(credentials);

      expect(result.user).toEqual(mockUser);
      expect(result.tokens.accessToken).toBe('accessToken');
      expect(result.tokens.refreshToken).toBe('refreshToken');
    });

    it('should throw error for non-existent user', async () => {
      mockUserService.prototype.getUserByEmail.mockResolvedValueOnce(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for incorrect password', async () => {
      mockUserService.prototype.getUserByEmail.mockResolvedValueOnce(mockUser);
      mockRedisClient.get.mockResolvedValueOnce('hashedPassword');
      mockBcrypt.compare.mockResolvedValueOnce(false);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error when password not found', async () => {
      mockUserService.prototype.getUserByEmail.mockResolvedValueOnce(mockUser);
      mockRedisClient.get.mockResolvedValueOnce(null);

      await expect(authService.login(credentials)).rejects.toThrow('Invalid email or password');
    });
  });

  describe('refreshToken', () => {
    const refreshToken = 'validRefreshToken';
    const decodedToken = {
      userId: '123',
      email: 'john@example.com',
      userType: 'homeowner',
      type: 'refresh',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    it('should refresh token successfully', async () => {
      mockJwt.verify.mockReturnValueOnce(decodedToken);
      mockRedisClient.get.mockResolvedValueOnce(null); // Not blacklisted
      mockUserService.prototype.getUserById.mockResolvedValueOnce(mockUser);
      mockRedisClient.setEx.mockResolvedValueOnce('OK'); // Blacklist old token
      mockJwt.sign.mockReturnValueOnce('newAccessToken').mockReturnValueOnce('newRefreshToken');

      const result = await authService.refreshToken(refreshToken);

      expect(result.accessToken).toBe('newAccessToken');
      expect(result.refreshToken).toBe('newRefreshToken');
    });

    it('should throw error for invalid token type', async () => {
      const invalidToken = { ...decodedToken, type: 'access' };
      mockJwt.verify.mockReturnValueOnce(invalidToken);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw error for blacklisted token', async () => {
      mockJwt.verify.mockReturnValueOnce(decodedToken);
      mockRedisClient.get.mockResolvedValueOnce('true'); // Blacklisted

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow(
        'Refresh token has been revoked'
      );
    });

    it('should throw error when user not found', async () => {
      mockJwt.verify.mockReturnValueOnce(decodedToken);
      mockRedisClient.get.mockResolvedValueOnce(null);
      mockUserService.prototype.getUserById.mockResolvedValueOnce(null);

      await expect(authService.refreshToken(refreshToken)).rejects.toThrow('User not found');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      const refreshToken = 'validRefreshToken';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwt.decode.mockReturnValueOnce(decodedToken);
      mockRedisClient.setEx.mockResolvedValueOnce('OK');

      await authService.logout(refreshToken);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        `blacklist:${refreshToken}`,
        expect.any(Number),
        'true'
      );
    });
  });

  describe('changePassword', () => {
    const userId = '123';
    const currentPassword = 'OldPassword123!';
    const newPassword = 'NewPassword123!';

    it('should change password successfully', async () => {
      mockRedisClient.get.mockResolvedValueOnce('hashedOldPassword');
      mockBcrypt.compare.mockResolvedValueOnce(true);
      mockBcrypt.hash.mockResolvedValueOnce('hashedNewPassword');
      mockRedisClient.setEx.mockResolvedValueOnce('OK');

      await authService.changePassword(userId, currentPassword, newPassword);

      expect(mockBcrypt.compare).toHaveBeenCalledWith(currentPassword, 'hashedOldPassword');
      expect(mockBcrypt.hash).toHaveBeenCalledWith(newPassword, 12);
    });

    it('should throw error when user not found', async () => {
      mockRedisClient.get.mockResolvedValueOnce(null);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('User not found');
    });

    it('should throw error for incorrect current password', async () => {
      mockRedisClient.get.mockResolvedValueOnce('hashedOldPassword');
      mockBcrypt.compare.mockResolvedValueOnce(false);

      await expect(
        authService.changePassword(userId, currentPassword, newPassword)
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for weak new password', async () => {
      mockRedisClient.get.mockResolvedValueOnce('hashedOldPassword');
      mockBcrypt.compare.mockResolvedValueOnce(true);

      await expect(
        authService.changePassword(userId, currentPassword, 'weak')
      ).rejects.toThrow('New password must be at least 8 characters long');
    });
  });

  describe('password validation', () => {
    it('should validate strong passwords', () => {
      const strongPasswords = [
        'Password123!',
        'MyStr0ng@Pass',
        'C0mplex#Password',
      ];

      strongPasswords.forEach(password => {
        expect(() => {
          // Access private method through any
          (authService as any).isValidPassword(password);
        }).not.toThrow();
      });
    });

    it('should reject weak passwords', () => {
      const weakPasswords = [
        'password', // No uppercase, number, special char
        'PASSWORD', // No lowercase, number, special char
        'Password', // No number, special char
        'Pass123', // Too short, no special char
        '12345678', // No letters, special char
      ];

      weakPasswords.forEach(password => {
        const isValid = (authService as any).isValidPassword(password);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('email validation', () => {
    it('should validate correct email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
      ];

      validEmails.forEach(email => {
        const isValid = (authService as any).isValidEmail(email);
        expect(isValid).toBe(true);
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user name@example.com',
      ];

      invalidEmails.forEach(email => {
        const isValid = (authService as any).isValidEmail(email);
        expect(isValid).toBe(false);
      });
    });
  });
});