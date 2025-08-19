import { PropertyService } from '../../services/PropertyService';
import { addressValidationService } from '../../services/AddressValidationService';
import { councilDataService } from '../../services/CouncilDataService';
import { Address } from '../../types';

// Mock the services
jest.mock('../../services/AddressValidationService');
jest.mock('../../services/CouncilDataService');

const mockAddressValidationService = addressValidationService as jest.Mocked<typeof addressValidationService>;
const mockCouncilDataService = councilDataService as jest.Mocked<typeof councilDataService>;

describe('PropertyService', () => {
  let service: PropertyService;

  beforeEach(() => {
    service = new PropertyService();
    jest.clearAllMocks();
  });

  const mockAddress: Address = {
    line1: 'Buckingham Palace',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'England'
  };

  describe('validatePropertyAddress', () => {
    it('should validate address and return council data', async () => {
      // Mock address validation success
      mockAddressValidationService.validateAddress.mockResolvedValueOnce({
        valid: true,
        errors: [],
        postcodeResult: {
          valid: true,
          postcode: 'SW1A1AA',
          normalizedPostcode: 'SW1A 1AA',
          address: {
            postcode: 'SW1A 1AA',
            country: 'England',
            region: 'London',
            adminDistrict: 'Westminster',
            adminCounty: null,
            adminWard: 'St James\'s',
            parish: null,
            constituency: 'Cities of London and Westminster',
            longitude: -0.141588,
            latitude: 51.501009
          }
        }
      });

      // Mock council data success
      mockCouncilDataService.getCouncilData.mockResolvedValueOnce({
        success: true,
        data: {
          conservationArea: true,
          listedBuilding: false,
          planningRestrictions: ['conservation area'],
          localAuthority: 'Westminster',
          contactDetails: {
            name: 'Westminster City Council',
            website: 'https://www.westminster.gov.uk'
          },
          lastChecked: '2024-01-15T10:00:00Z'
        },
        source: 'api',
        lastUpdated: '2024-01-15T10:00:00Z'
      });

      const result = await service.validatePropertyAddress(mockAddress);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalizedAddress?.postcode).toBe('SW1A 1AA');
      expect(result.councilData?.data?.conservationArea).toBe(true);
      expect(result.councilData?.source).toBe('api');
    });

    it('should handle address validation failure', async () => {
      mockAddressValidationService.validateAddress.mockResolvedValueOnce({
        valid: false,
        errors: [
          {
            field: 'postcode',
            message: 'Invalid postcode',
            code: 'INVALID_POSTCODE'
          }
        ]
      });

      const result = await service.validatePropertyAddress(mockAddress);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('postcode');
      expect(mockCouncilDataService.getCouncilData).not.toHaveBeenCalled();
    });

    it('should continue when council data fails', async () => {
      // Mock address validation success
      mockAddressValidationService.validateAddress.mockResolvedValueOnce({
        valid: true,
        errors: [],
        postcodeResult: {
          valid: true,
          postcode: 'SW1A1AA',
          normalizedPostcode: 'SW1A 1AA',
          address: {
            postcode: 'SW1A 1AA',
            country: 'England',
            region: 'London',
            adminDistrict: 'Westminster',
            adminCounty: null,
            adminWard: 'St James\'s',
            parish: null,
            constituency: 'Cities of London and Westminster',
            longitude: -0.141588,
            latitude: 51.501009
          }
        }
      });

      // Mock council data failure
      mockCouncilDataService.getCouncilData.mockRejectedValueOnce(
        new Error('Council service unavailable')
      );

      const result = await service.validatePropertyAddress(mockAddress);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.councilData?.success).toBe(false);
      expect(result.councilData?.error).toBe('Council data temporarily unavailable');
      expect(result.councilData?.source).toBe('fallback');
    });

    it('should handle service unavailable', async () => {
      mockAddressValidationService.validateAddress.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const result = await service.validatePropertyAddress(mockAddress);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('validatePostcode', () => {
    it('should validate postcode successfully', async () => {
      const mockResult = {
        valid: true,
        postcode: 'SW1A1AA',
        normalizedPostcode: 'SW1A 1AA'
      };

      mockAddressValidationService.validatePostcode.mockResolvedValueOnce(mockResult);

      const result = await service.validatePostcode('SW1A 1AA');

      expect(result).toEqual(mockResult);
      expect(mockAddressValidationService.validatePostcode).toHaveBeenCalledWith('SW1A 1AA');
    });
  });

  describe('getCouncilDataByPostcode', () => {
    it('should get council data for valid postcode', async () => {
      mockAddressValidationService.validatePostcode.mockResolvedValueOnce({
        valid: true,
        postcode: 'SW1A1AA',
        normalizedPostcode: 'SW1A 1AA',
        address: {
          postcode: 'SW1A 1AA',
          country: 'England',
          region: 'London',
          adminDistrict: 'Westminster',
          adminCounty: null,
          adminWard: 'St James\'s',
          parish: null,
          constituency: 'Cities of London and Westminster',
          longitude: -0.141588,
          latitude: 51.501009
        }
      });

      const mockCouncilData = {
        success: true,
        data: {
          conservationArea: true,
          listedBuilding: false,
          planningRestrictions: [],
          localAuthority: 'Westminster',
          contactDetails: {
            name: 'Westminster City Council',
            website: 'https://www.westminster.gov.uk'
          },
          lastChecked: '2024-01-15T10:00:00Z'
        },
        source: 'api' as const,
        lastUpdated: '2024-01-15T10:00:00Z'
      };

      mockCouncilDataService.getCouncilData.mockResolvedValueOnce(mockCouncilData);

      const result = await service.getCouncilDataByPostcode('SW1A 1AA');

      expect(result).toEqual(mockCouncilData);
    });

    it('should handle invalid postcode', async () => {
      mockAddressValidationService.validatePostcode.mockResolvedValueOnce({
        valid: false,
        error: 'Invalid postcode'
      });

      const result = await service.getCouncilDataByPostcode('INVALID');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid postcode provided');
      expect(result.source).toBe('fallback');
    });

    it('should handle service error', async () => {
      mockAddressValidationService.validatePostcode.mockRejectedValueOnce(
        new Error('Service error')
      );

      const result = await service.getCouncilDataByPostcode('SW1A 1AA');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
      expect(result.source).toBe('fallback');
    });
  });

  describe('refreshCouncilData', () => {
    it('should clear cache for specific local authority', async () => {
      await service.refreshCouncilData('Westminster');

      expect(mockCouncilDataService.clearCache).toHaveBeenCalledWith('Westminster');
    });

    it('should clear all cache when no authority specified', async () => {
      await service.refreshCouncilData('');

      expect(mockCouncilDataService.clearCache).toHaveBeenCalledWith('');
    });
  });

  describe('getServiceHealth', () => {
    it('should return healthy status', async () => {
      mockAddressValidationService.validatePostcode.mockResolvedValueOnce({
        valid: true,
        postcode: 'SW1A1AA',
        normalizedPostcode: 'SW1A 1AA'
      });

      mockCouncilDataService.getCacheStats.mockReturnValueOnce({
        keys: 5,
        hits: 10,
        misses: 2
      });

      const result = await service.getServiceHealth();

      expect(result.addressValidation).toBe(true);
      expect(result.councilData).toBe(true);
      expect(result.cacheStats).toEqual({
        keys: 5,
        hits: 10,
        misses: 2
      });
    });

    it('should handle address validation service failure', async () => {
      mockAddressValidationService.validatePostcode.mockRejectedValueOnce(
        new Error('Service down')
      );

      mockCouncilDataService.getCacheStats.mockReturnValueOnce({
        keys: 0,
        hits: 0,
        misses: 0
      });

      const result = await service.getServiceHealth();

      expect(result.addressValidation).toBe(false);
      expect(result.councilData).toBe(true);
    });
  });
});