import { UserModel } from '../../models/User';
import { User, UserProfile } from '../../types';

describe('UserModel', () => {
  const mockUserProfile: UserProfile = {
    firstName: 'John',
    lastName: 'Doe',
    phone: '+447123456789',
  };

  const mockBuilderProfile: UserProfile = {
    firstName: 'Jane',
    lastName: 'Builder',
    phone: '+447987654321',
    companyName: 'Builder Co Ltd',
    certifications: ['CSCS', 'Gas Safe'],
    insurance: {
      provider: 'Insurance Co',
      policyNumber: 'POL123456',
      expiryDate: '2025-12-31',
      coverageAmount: 1000000,
    },
  };

  describe('create', () => {
    it('should create a valid user object', () => {
      const userData = {
        email: 'john@example.com',
        userType: 'homeowner' as const,
        profile: mockUserProfile,
        gdprConsent: true,
      };

      const user = UserModel.create(userData);

      expect(user.id).toBeDefined();
      expect(user.PK).toBe(`USER#${user.id}`);
      expect(user.SK).toBe('PROFILE');
      expect(user.email).toBe('john@example.com');
      expect(user.userType).toBe('homeowner');
      expect(user.profile).toEqual(mockUserProfile);
      expect(user.gdprConsent).toBe(true);
      expect(user.emailVerified).toBe(false);
      expect(user.GSI1PK).toBe('john@example.com');
      expect(user.GSI1SK).toBe('homeowner');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should convert email to lowercase', () => {
      const userData = {
        email: 'JOHN@EXAMPLE.COM',
        userType: 'homeowner' as const,
        profile: mockUserProfile,
        gdprConsent: true,
      };

      const user = UserModel.create(userData);

      expect(user.email).toBe('john@example.com');
      expect(user.GSI1PK).toBe('john@example.com');
    });
  });

  describe('update', () => {
    it('should update user with new data and timestamp', () => {
      const existingUser: User = {
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

      const updates = { emailVerified: true };
      const updatedUser = UserModel.update(existingUser, updates);

      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.updatedAt).not.toBe(existingUser.updatedAt);
      expect(new Date(updatedUser.updatedAt).getTime()).toBeGreaterThan(
        new Date(existingUser.updatedAt).getTime()
      );
    });
  });

  describe('validateProfile', () => {
    it('should return no errors for valid homeowner profile', () => {
      const errors = UserModel.validateProfile(mockUserProfile, 'homeowner');
      expect(errors).toEqual([]);
    });

    it('should return no errors for valid builder profile', () => {
      const errors = UserModel.validateProfile(mockBuilderProfile, 'builder');
      expect(errors).toEqual([]);
    });

    it('should return errors for missing required fields', () => {
      const invalidProfile: UserProfile = {
        firstName: '',
        lastName: '',
      };

      const errors = UserModel.validateProfile(invalidProfile, 'homeowner');
      expect(errors).toContain('First name is required');
      expect(errors).toContain('Last name is required');
    });

    it('should return error for builder without company name', () => {
      const builderWithoutCompany: UserProfile = {
        firstName: 'Jane',
        lastName: 'Builder',
      };

      const errors = UserModel.validateProfile(builderWithoutCompany, 'builder');
      expect(errors).toContain('Company name is required for builders');
    });

    it('should return error for invalid phone number', () => {
      const profileWithInvalidPhone: UserProfile = {
        firstName: 'John',
        lastName: 'Doe',
        phone: '123',
      };

      const errors = UserModel.validateProfile(profileWithInvalidPhone, 'homeowner');
      expect(errors).toContain('Invalid phone number format');
    });

    it('should return error for invalid address', () => {
      const profileWithInvalidAddress: UserProfile = {
        firstName: 'John',
        lastName: 'Doe',
        address: {
          line1: '',
          city: 'London',
          county: 'Greater London',
          postcode: 'INVALID',
          country: 'UK',
        },
      };

      const errors = UserModel.validateProfile(profileWithInvalidAddress, 'homeowner');
      expect(errors).toContain('Invalid address format');
    });

    it('should return error for invalid insurance details', () => {
      const profileWithInvalidInsurance: UserProfile = {
        firstName: 'Jane',
        lastName: 'Builder',
        companyName: 'Builder Co',
        insurance: {
          provider: '',
          policyNumber: 'POL123',
          expiryDate: '2020-01-01', // Expired
          coverageAmount: -1000,
        },
      };

      const errors = UserModel.validateProfile(profileWithInvalidInsurance, 'builder');
      expect(errors).toContain('Invalid insurance details');
    });
  });

  describe('sanitizeForResponse', () => {
    it('should remove GSI fields from user object', () => {
      const user: User = {
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

      const sanitized = UserModel.sanitizeForResponse(user);

      expect(sanitized).not.toHaveProperty('GSI1PK');
      expect(sanitized).not.toHaveProperty('GSI1SK');
      expect(sanitized.id).toBe('123');
      expect(sanitized.email).toBe('john@example.com');
    });
  });

  describe('createGDPRExport', () => {
    it('should create GDPR export data', () => {
      const user: User = {
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

      const exportData = UserModel.createGDPRExport(user);

      expect(exportData.personalData).toBeDefined();
      expect(exportData.personalData.id).toBe('123');
      expect(exportData.personalData.email).toBe('john@example.com');
      expect(exportData.consentData).toBeDefined();
      expect(exportData.consentData.gdprConsent).toBe(true);
      expect(exportData.exportDate).toBeDefined();
    });
  });
});