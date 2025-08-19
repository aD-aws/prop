import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { UserService } from './UserService';
import { User, JWTPayload } from '../types';
import { logger } from '../utils/logger';
import { redisClient } from '../config/redis';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  userType: 'homeowner' | 'builder' | 'admin';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
    certifications?: string[];
  };
  gdprConsent: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async register(registerData: RegisterData): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Validate email format
      if (!this.isValidEmail(registerData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (!this.isValidPassword(registerData.password)) {
        throw new Error('Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }

      // Check GDPR consent
      if (!registerData.gdprConsent) {
        throw new Error('GDPR consent is required');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(registerData.password, 12);

      // Create user
      const user = await this.userService.createUser({
        email: registerData.email,
        userType: registerData.userType,
        profile: registerData.profile,
        gdprConsent: registerData.gdprConsent,
      });

      // Store hashed password separately (in a real implementation, this might be in a separate table)
      await this.storeUserPassword(user.id, hashedPassword);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User registered successfully', { userId: user.id, email: user.email });
      return { user, tokens };
    } catch (error) {
      logger.error('Error during registration:', error);
      throw error;
    }
  }

  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    try {
      // Get user by email
      const user = await this.userService.getUserByEmail(credentials.email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Verify password
      const storedPassword = await this.getUserPassword(user.id);
      if (!storedPassword) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await bcrypt.compare(credentials.password, storedPassword);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User logged in successfully', { userId: user.id, email: user.email });
      return { user, tokens };
    } catch (error) {
      logger.error('Error during login:', error);
      throw error;
    }
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwt.secret) as JWTPayload & { type: string };
      
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Check if refresh token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new Error('Refresh token has been revoked');
      }

      // Get user
      const user = await this.userService.getUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Blacklist old refresh token
      await this.blacklistToken(refreshToken);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      logger.info('Token refreshed successfully', { userId: user.id });
      return tokens;
    } catch (error) {
      logger.error('Error refreshing token:', error);
      throw error;
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Blacklist refresh token
      await this.blacklistToken(refreshToken);
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Error during logout:', error);
      throw error;
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Verify current password
      const storedPassword = await this.getUserPassword(userId);
      if (!storedPassword) {
        throw new Error('User not found');
      }

      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, storedPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Validate new password
      if (!this.isValidPassword(newPassword)) {
        throw new Error('New password must be at least 8 characters long and contain uppercase, lowercase, number, and special character');
      }

      // Hash and store new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);
      await this.storeUserPassword(userId, hashedNewPassword);

      logger.info('Password changed successfully', { userId });
    } catch (error) {
      logger.error('Error changing password:', error);
      throw error;
    }
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload = {
      userId: user.id,
      email: user.email,
      userType: user.userType,
    };

    const accessToken = (jwt as any).sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshPayload = {
      ...payload,
      type: 'refresh',
    };

    const refreshToken = (jwt as any).sign(refreshPayload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.parseTimeToSeconds(config.jwt.expiresIn),
    };
  }

  private async storeUserPassword(userId: string, hashedPassword: string): Promise<void> {
    // In a production environment, you might want to store this in a separate table
    // or use a more secure method. For now, we'll use Redis with a TTL
    const key = `user_password:${userId}`;
    await redisClient.setEx(key, 86400 * 365, hashedPassword); // 1 year TTL
  }

  private async getUserPassword(userId: string): Promise<string | null> {
    const key = `user_password:${userId}`;
    return await redisClient.get(key);
  }

  private async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redisClient.setEx(`blacklist:${token}`, ttl, 'true');
        }
      }
    } catch (error) {
      logger.error('Error blacklisting token:', error);
    }
  }

  private async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const result = await redisClient.get(`blacklist:${token}`);
      return result === 'true';
    } catch (error) {
      logger.error('Error checking token blacklist:', error);
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  private parseTimeToSeconds(timeString: string): number {
    const unit = timeString.slice(-1);
    const value = parseInt(timeString.slice(0, -1), 10);

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600; // Default to 1 hour
    }
  }
}