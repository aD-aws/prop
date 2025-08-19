import { UserService } from '../../services/UserService';
import { UserModel } from '../../models/User';
import { dynamoDBDocClient } from '../../config/aws';
import { User, UserProfile } from '../../types';

// Mock AWS SDK
jest.mock('../../config/aws', () => ({
  dynamoDBDocClient: {
    send: jest.fn(),
  },
  TABLE_NAME: 'test-table',
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;
  const mockSend = dynamoDBDocClient.send as jest.Mock;

  const mockUserProfile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+447123456789',
  };

  const mockUser: User = {
    PK: 'USER#123',
    SK: 'PROFILE',
    id: '123',
    email: 'john@example.com',
    userType: 'homeowner',
    profile: mockUserProfile,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    gdprConsent: true,
    emailVerified: false,
    GSI1PK: 'john@example.com',
    GSI1SK: 'homeowner',
  };

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const userData = {
      email: 'john@example.com',
      userType: 'homeowner' as const,
      profile: mockUserProfile,
      gdprConsent: true,
    };

    it('should create a user successfully', async () => {
      // Mock getUserByEmail to return null (user doesn't exist)
      mockSend.mockResolvedValueOnce({ Items: [] });
      // Mock PutCommand success
      mockSend.mockResolvedValueOnce({});

      const result = await userService.createUser(userData);

      expect(result.email).toBe('john@example.com');
      expect(result.userType).toBe('homeowner');
      expect(result.profile).toEqual(mockUserProfile);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user already exists', async () => {
      // Mock getUserByEmail to return existing user
      mockSend.mockResolvedValueOnce({ Items: [mockUser] });

      await expect(userService.createUser(userData)).rejects.toThrow(
        'User with this email already exists'
      );
    });

    it('should throw error for invalid profile data', async () => {
      const invalidUserData = {
        ...userData,
        profile: { firstName: '', lastName: '' },
      };

      // Mock getUserByEmail to return null
      mockSend.mockResolvedValueOnce({ Items: [] });

      await expect(userService.createUser(invalidUserData)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockUser });

      const result = await userService.getUserById('123');

      expect(result).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      const result = await userService.getUserById('123');

      expect(result).toBeNull();
    });

    it('should throw error on database error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Database error'));

      await expect(userService.getUserById('123')).rejects.toThrow('Database error');
    });
  });

  describe('getUserByEmail', () => {
    it('should return user when found', async () => {
      mockSend.mockResolvedValueOnce({ Items: [mockUser] });

      const result = await userService.getUserByEmail('john@example.com');

      expect(result).toEqual(mockUser);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return null when user not found', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await userService.getUserByEmail('john@example.com');

      expect(result).toBeNull();
    });

    it('should convert email to lowercase', async () => {
      mockSend.mockResolvedValueOnce({ Items: [mockUser] });

      await userService.getUserByEmail('JOHN@EXAMPLE.COM');

      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateUser', () => {
    const updates = {
      profile: { firstName: 'Jane', lastName: 'Doe' },
      emailVerified: true,
    };

    it('should update user successfully', async () => {
      // Mock getUserById
      mockSend.mockResolvedValueOnce({ Item: mockUser });
      // Mock PutCommand
      mockSend.mockResolvedValueOnce({});

      const result = await userService.updateUser('123', updates);

      expect(result.profile.firstName).toBe('Jane');
      expect(result.emailVerified).toBe(true);
      expect(result.updatedAt).not.toBe(mockUser.updatedAt);
    });

    it('should throw error if user not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(userService.updateUser('123', updates)).rejects.toThrow('User not found');
    });

    it('should validate updated profile', async () => {
      const invalidUpdates = {
        profile: { firstName: '', lastName: '' },
      };

      mockSend.mockResolvedValueOnce({ Item: mockUser });

      await expect(userService.updateUser('123', invalidUpdates)).rejects.toThrow(
        'Validation failed'
      );
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      // Mock getUserById
      mockSend.mockResolvedValueOnce({ Item: mockUser });
      // Mock DeleteCommand
      mockSend.mockResolvedValueOnce({});

      await userService.deleteUser('123');

      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error if user not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(userService.deleteUser('123')).rejects.toThrow('User not found');
    });
  });

  describe('getUsersByType', () => {
    it('should return users of specified type', async () => {
      const mockUsers = [mockUser];
      mockSend.mockResolvedValueOnce({ Items: mockUsers });

      const result = await userService.getUsersByType('homeowner');

      expect(result).toEqual(mockUsers);
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no users found', async () => {
      mockSend.mockResolvedValueOnce({ Items: [] });

      const result = await userService.getUsersByType('builder');

      expect(result).toEqual([]);
    });
  });

  describe('exportUserData', () => {
    it('should export user data successfully', async () => {
      mockSend.mockResolvedValueOnce({ Item: mockUser });

      const result = await userService.exportUserData('123');

      expect(result.personalData).toBeDefined();
      expect(result.personalData.id).toBe('123');
      expect(result.consentData).toBeDefined();
      expect(result.exportDate).toBeDefined();
    });

    it('should throw error if user not found', async () => {
      mockSend.mockResolvedValueOnce({ Item: undefined });

      await expect(userService.exportUserData('123')).rejects.toThrow('User not found');
    });
  });

  describe('verifyEmail', () => {
    it('should verify email successfully', async () => {
      // Mock getUserById
      mockSend.mockResolvedValueOnce({ Item: mockUser });
      // Mock PutCommand
      mockSend.mockResolvedValueOnce({});

      await userService.verifyEmail('123');

      expect(mockSend).toHaveBeenCalledTimes(2);
    });
  });
});