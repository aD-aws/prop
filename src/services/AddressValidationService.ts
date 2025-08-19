import axios, { AxiosResponse } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { PostcodeValidationResult, PostcodeAddress, ValidationError } from '../types';

export class AddressValidationService {
  private readonly apiUrl: string;
  private readonly timeout: number;

  constructor() {
    this.apiUrl = config.postcode.apiUrl;
    this.timeout = config.postcode.timeout;
  }

  /**
   * Validates a UK postcode using the postcodes.io API
   */
  async validatePostcode(postcode: string): Promise<PostcodeValidationResult> {
    try {
      // Clean and normalize the postcode
      const cleanPostcode = this.normalizePostcode(postcode);
      
      if (!this.isValidPostcodeFormat(cleanPostcode)) {
        return {
          valid: false,
          error: 'Invalid postcode format'
        };
      }

      // Call the postcodes.io API
      const response: AxiosResponse = await axios.get(
        `${this.apiUrl}/postcodes/${encodeURIComponent(cleanPostcode)}`,
        {
          timeout: this.timeout,
          headers: {
            'User-Agent': 'UK-Home-Improvement-Platform/1.0'
          }
        }
      );

      if (response.data.status === 200 && response.data.result) {
        const result = response.data.result;
        
        const postcodeAddress: PostcodeAddress = {
          postcode: result.postcode,
          country: result.country,
          region: result.region,
          adminDistrict: result.admin_district,
          adminCounty: result.admin_county,
          adminWard: result.admin_ward,
          parish: result.parish,
          constituency: result.parliamentary_constituency,
          longitude: result.longitude,
          latitude: result.latitude
        };

        logger.info(`Postcode validation successful: ${cleanPostcode}`);
        
        return {
          valid: true,
          postcode: cleanPostcode,
          normalizedPostcode: result.postcode,
          address: postcodeAddress
        };
      }

      return {
        valid: false,
        error: 'Postcode not found'
      };

    } catch (error: any) {
      logger.error('Postcode validation failed:', {
        postcode,
        error: error.message,
        status: error.response?.status
      });

      if (error.response?.status === 404) {
        return {
          valid: false,
          error: 'Postcode not found'
        };
      }

      return {
        valid: false,
        error: 'Postcode validation service unavailable'
      };
    }
  }

  /**
   * Validates a full UK address including postcode
   */
  async validateAddress(address: {
    line1: string;
    line2?: string;
    city: string;
    county?: string;
    postcode: string;
  }): Promise<{ valid: boolean; errors: ValidationError[]; postcodeResult?: PostcodeValidationResult }> {
    const errors: ValidationError[] = [];

    // Validate required fields
    if (!address.line1?.trim()) {
      errors.push({
        field: 'line1',
        message: 'Address line 1 is required',
        code: 'REQUIRED'
      });
    }

    if (!address.city?.trim()) {
      errors.push({
        field: 'city',
        message: 'City is required',
        code: 'REQUIRED'
      });
    }

    if (!address.postcode?.trim()) {
      errors.push({
        field: 'postcode',
        message: 'Postcode is required',
        code: 'REQUIRED'
      });
    }

    // Validate postcode if provided
    let postcodeResult: PostcodeValidationResult | undefined;
    if (address.postcode?.trim()) {
      postcodeResult = await this.validatePostcode(address.postcode);
      
      if (!postcodeResult.valid) {
        errors.push({
          field: 'postcode',
          message: postcodeResult.error || 'Invalid postcode',
          code: 'INVALID_POSTCODE'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      postcodeResult
    };
  }

  /**
   * Normalizes a postcode by removing spaces and converting to uppercase
   */
  private normalizePostcode(postcode: string): string {
    return postcode.replace(/\s+/g, '').toUpperCase();
  }

  /**
   * Validates UK postcode format using regex
   */
  private isValidPostcodeFormat(postcode: string): boolean {
    // UK postcode regex pattern
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?[0-9][A-Z]{2}$/;
    return postcodeRegex.test(postcode);
  }

  /**
   * Gets the local authority for a given postcode
   */
  async getLocalAuthority(postcode: string): Promise<string | null> {
    try {
      const result = await this.validatePostcode(postcode);
      return result.address?.adminDistrict || null;
    } catch (error) {
      logger.error('Failed to get local authority:', { postcode, error });
      return null;
    }
  }
}

export const addressValidationService = new AddressValidationService();