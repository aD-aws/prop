import { User, UserProfile, Address, InsuranceDetails } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class UserModel {
  static create(userData: {
    email: string;
    userType: 'homeowner' | 'builder' | 'admin';
    profile: UserProfile;
    gdprConsent: boolean;
  }): User {
    const userId = uuidv4();
    const now = new Date().toISOString();

    return {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      id: userId,
      email: userData.email.toLowerCase(),
      userType: userData.userType,
      profile: userData.profile,
      createdAt: now,
      updatedAt: now,
      gdprConsent: userData.gdprConsent,
      emailVerified: false,
      GSI1PK: userData.email.toLowerCase(),
      GSI1SK: userData.userType,
    };
  }

  static update(existingUser: User, updates: Partial<User>): User {
    return {
      ...existingUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }

  static validateProfile(profile: UserProfile, userType: string): string[] {
    const errors: string[] = [];

    if (!profile.firstName?.trim()) {
      errors.push('First name is required');
    }

    if (!profile.lastName?.trim()) {
      errors.push('Last name is required');
    }

    if (profile.phone && !this.isValidPhoneNumber(profile.phone)) {
      errors.push('Invalid phone number format');
    }

    if (userType === 'builder') {
      if (!profile.companyName?.trim()) {
        errors.push('Company name is required for builders');
      }

      if (profile.insurance && !this.isValidInsurance(profile.insurance)) {
        errors.push('Invalid insurance details');
      }
    }

    if (profile.address && !this.isValidAddress(profile.address)) {
      errors.push('Invalid address format');
    }

    return errors;
  }

  private static isValidPhoneNumber(phone: string): boolean {
    // UK phone number validation (basic)
    const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/;
    return ukPhoneRegex.test(phone.replace(/\s/g, ''));
  }

  private static isValidAddress(address: Address): boolean {
    return !!(
      address.line1?.trim() &&
      address.city?.trim() &&
      address.postcode?.trim() &&
      this.isValidPostcode(address.postcode)
    );
  }

  private static isValidPostcode(postcode: string): boolean {
    // UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode.replace(/\s/g, ''));
  }

  private static isValidInsurance(insurance: InsuranceDetails): boolean {
    return !!(
      insurance.provider?.trim() &&
      insurance.policyNumber?.trim() &&
      insurance.expiryDate &&
      new Date(insurance.expiryDate) > new Date() &&
      insurance.coverageAmount > 0
    );
  }

  static sanitizeForResponse(user: User): Omit<User, 'GSI1PK' | 'GSI1SK'> {
    const { GSI1PK, GSI1SK, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  static createGDPRExport(user: User): Record<string, any> {
    return {
      personalData: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        profile: user.profile,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        emailVerified: user.emailVerified,
      },
      consentData: {
        gdprConsent: user.gdprConsent,
        consentDate: user.createdAt,
      },
      exportDate: new Date().toISOString(),
    };
  }
}