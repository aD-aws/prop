import { logger } from '../utils/logger';
import { 
  Address, 
  PostcodeValidationResult, 
  CouncilDataResult, 
  ValidationError 
} from '../types';
import { addressValidationService } from './AddressValidationService';
import { councilDataService } from './CouncilDataService';

export interface PropertyValidationResult {
  valid: boolean;
  errors: ValidationError[];
  postcodeResult?: PostcodeValidationResult;
  councilData?: CouncilDataResult;
  normalizedAddress?: Address;
}

export class PropertyService {
  /**
   * Validates a property address and retrieves council data
   */
  async validatePropertyAddress(address: Address): Promise<PropertyValidationResult> {
    try {
      logger.info('Starting property address validation', { postcode: address.postcode });

      // First validate the address format and postcode
      const addressValidation = await addressValidationService.validateAddress({
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        county: address.county,
        postcode: address.postcode
      });

      if (!addressValidation.valid) {
        return {
          valid: false,
          errors: addressValidation.errors
        };
      }

      const postcodeResult = addressValidation.postcodeResult!;
      
      // Create normalized address using postcode API data
      const normalizedAddress: Address = {
        line1: address.line1,
        line2: address.line2,
        city: postcodeResult.address?.adminDistrict || address.city,
        county: postcodeResult.address?.adminCounty || address.county || '',
        postcode: postcodeResult.normalizedPostcode || address.postcode,
        country: postcodeResult.address?.country || 'England'
      };

      // Get council data if postcode validation was successful
      let councilData: CouncilDataResult | undefined;
      if (postcodeResult.address) {
        try {
          councilData = await councilDataService.getCouncilData(postcodeResult.address);
        } catch (error: any) {
          logger.warn('Council data retrieval failed, continuing without it', {
            postcode: address.postcode,
            error: error.message
          });
          
          // Don't fail the entire validation if council data fails
          councilData = {
            success: false,
            error: 'Council data temporarily unavailable',
            source: 'fallback',
            lastUpdated: new Date().toISOString()
          };
        }
      }

      logger.info('Property address validation completed successfully', {
        postcode: address.postcode,
        localAuthority: postcodeResult.address?.adminDistrict,
        councilDataSource: councilData?.source
      });

      return {
        valid: true,
        errors: [],
        postcodeResult,
        councilData,
        normalizedAddress
      };

    } catch (error: any) {
      logger.error('Property address validation failed', {
        postcode: address.postcode,
        error: error.message
      });

      return {
        valid: false,
        errors: [{
          field: 'address',
          message: 'Address validation service temporarily unavailable',
          code: 'SERVICE_UNAVAILABLE'
        }]
      };
    }
  }

  /**
   * Validates just the postcode without full address validation
   */
  async validatePostcode(postcode: string): Promise<PostcodeValidationResult> {
    return await addressValidationService.validatePostcode(postcode);
  }

  /**
   * Gets council data for a specific postcode
   */
  async getCouncilDataByPostcode(postcode: string): Promise<CouncilDataResult> {
    try {
      const postcodeResult = await addressValidationService.validatePostcode(postcode);
      
      if (!postcodeResult.valid || !postcodeResult.address) {
        return {
          success: false,
          error: 'Invalid postcode provided',
          source: 'fallback',
          lastUpdated: new Date().toISOString()
        };
      }

      return await councilDataService.getCouncilData(postcodeResult.address);
    } catch (error: any) {
      logger.error('Council data retrieval by postcode failed', {
        postcode,
        error: error.message
      });

      return {
        success: false,
        error: error.message,
        source: 'fallback',
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Refreshes council data for a specific local authority
   */
  async refreshCouncilData(localAuthority: string): Promise<void> {
    councilDataService.clearCache(localAuthority);
    logger.info('Council data cache cleared', { localAuthority });
  }

  /**
   * Gets service health status
   */
  async getServiceHealth(): Promise<{
    addressValidation: boolean;
    councilData: boolean;
    cacheStats: any;
  }> {
    try {
      // Test address validation service
      const testPostcode = 'SW1A 1AA'; // Buckingham Palace postcode for testing
      const addressTest = await addressValidationService.validatePostcode(testPostcode);
      
      return {
        addressValidation: addressTest.valid,
        councilData: true, // Council data service is always available (has fallbacks)
        cacheStats: councilDataService.getCacheStats()
      };
    } catch (error) {
      return {
        addressValidation: false,
        councilData: true,
        cacheStats: councilDataService.getCacheStats()
      };
    }
  }
}

export const propertyService = new PropertyService();