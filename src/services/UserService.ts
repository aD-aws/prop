import { GetCommand, PutCommand, UpdateCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocClient, TABLE_NAME } from '../config/aws';
import { User, UserProfile } from '../types';
import { UserModel } from '../models/User';
import { logger } from '../utils/logger';

export class UserService {
  async createUser(userData: {
    email: string;
    userType: 'homeowner' | 'builder' | 'admin';
    profile: UserProfile;
    gdprConsent: boolean;
  }): Promise<User> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Validate profile data
      const validationErrors = UserModel.validateProfile(userData.profile, userData.userType);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const user = UserModel.create(userData);

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: user,
        ConditionExpression: 'attribute_not_exists(PK)',
      });

      await dynamoDBDocClient.send(command);

      logger.info('User created successfully', { userId: user.id, email: user.email });
      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
      });

      const result = await dynamoDBDocClient.send(command);
      return result.Item as User || null;
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :email',
        ExpressionAttributeValues: {
          ':email': email.toLowerCase(),
        },
        Limit: 1,
      });

      const result = await dynamoDBDocClient.send(command);
      return result.Items?.[0] as User || null;
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }

  async updateUser(userId: string, updates: {
    profile?: Partial<UserProfile>;
    emailVerified?: boolean;
  }): Promise<User> {
    try {
      const existingUser = await this.getUserById(userId);
      if (!existingUser) {
        throw new Error('User not found');
      }

      const updatedProfile = updates.profile 
        ? { ...existingUser.profile, ...updates.profile }
        : existingUser.profile;

      // Validate updated profile
      if (updates.profile) {
        const validationErrors = UserModel.validateProfile(updatedProfile, existingUser.userType);
        if (validationErrors.length > 0) {
          throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
        }
      }

      const updatedUser = UserModel.update(existingUser, {
        profile: updatedProfile,
        emailVerified: updates.emailVerified ?? existingUser.emailVerified,
      });

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedUser,
      });

      await dynamoDBDocClient.send(command);

      logger.info('User updated successfully', { userId });
      return updatedUser;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }

  async deleteUser(userId: string): Promise<void> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `USER#${userId}`,
          SK: 'PROFILE',
        },
      });

      await dynamoDBDocClient.send(command);

      logger.info('User deleted successfully', { userId, email: user.email });
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }

  async getUsersByType(userType: 'homeowner' | 'builder' | 'admin'): Promise<User[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1SK = :userType',
        ExpressionAttributeValues: {
          ':userType': userType,
        },
      });

      const result = await dynamoDBDocClient.send(command);
      return result.Items as User[] || [];
    } catch (error) {
      logger.error('Error getting users by type:', error);
      throw error;
    }
  }

  async exportUserData(userId: string): Promise<Record<string, any>> {
    try {
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // In a full implementation, this would also include related data
      // like projects, quotes, contracts, etc.
      const exportData = UserModel.createGDPRExport(user);

      logger.info('User data exported', { userId });
      return exportData;
    } catch (error) {
      logger.error('Error exporting user data:', error);
      throw error;
    }
  }

  async verifyEmail(userId: string): Promise<void> {
    try {
      await this.updateUser(userId, { emailVerified: true });
      logger.info('Email verified successfully', { userId });
    } catch (error) {
      logger.error('Error verifying email:', error);
      throw error;
    }
  }
}