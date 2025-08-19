import { AddressValidationService } from '../../services/AddressValidationService';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AddressValidationService', () => {
  let service: AddressValidationService;

  beforeEach(() => {
    service = new AddressValidationService();
    jest.clearAllMocks();
  });

  describe('validatePostcode', () => {
    it('should validate a correct UK postcode', async () => {
      const mockResponse = {
        data: {
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            country: 'England',
            region: 'London',
            admin_district: 'Westminster',
            admin_county: null,
            admin_ward: 'St James\'s',
            parish: null,
            parliamentary_constituency: 'Cities of London and Westminster',
            longitude: -0.141588,
            latitude: 51.501009
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.validatePostcode('SW1A1AA');

      expect(result.valid).toBe(true);
      expect(result.normalizedPostcode).toBe('SW1A 1AA');
      expect(result.address?.adminDistrict).toBe('Westminster');
      expect(result.address?.longitude).toBe(-0.141588);
      expect(result.address?.latitude).toBe(51.501009);
    });

    it('should handle invalid postcode format', async () => {
      const result = await service.validatePostcode('INVALID');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid postcode format');
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });

    it('should handle postcode not found', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      const result = await service.validatePostcode('ZZ99 9ZZ');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Postcode not found');
    });

    it('should handle API service unavailable', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.validatePostcode('SW1A 1AA');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Postcode validation service unavailable');
    });

    it('should normalize postcode correctly', async () => {
      const mockResponse = {
        data: {
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            country: 'England',
            region: 'London',
            admin_district: 'Westminster',
            admin_county: null,
            admin_ward: 'St James\'s',
            parish: null,
            parliamentary_constituency: 'Cities of London and Westminster',
            longitude: -0.141588,
            latitude: 51.501009
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      // Test with spaces and lowercase
      const result = await service.validatePostcode('sw1a 1aa');

      expect(result.valid).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('SW1A1AA'),
        expect.any(Object)
      );
    });
  });

  describe('validateAddress', () => {
    it('should validate a complete address', async () => {
      const mockResponse = {
        data: {
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            country: 'England',
            region: 'London',
            admin_district: 'Westminster',
            admin_county: null,
            admin_ward: 'St James\'s',
            parish: null,
            parliamentary_constituency: 'Cities of London and Westminster',
            longitude: -0.141588,
            latitude: 51.501009
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const address = {
        line1: 'Buckingham Palace',
        city: 'London',
        postcode: 'SW1A 1AA'
      };

      const result = await service.validateAddress(address);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.postcodeResult?.valid).toBe(true);
    });

    it('should return validation errors for missing required fields', async () => {
      const address = {
        line1: '',
        city: '',
        postcode: ''
      };

      const result = await service.validateAddress(address);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.map(e => e.field)).toContain('line1');
      expect(result.errors.map(e => e.field)).toContain('city');
      expect(result.errors.map(e => e.field)).toContain('postcode');
    });

    it('should validate address with optional fields', async () => {
      const mockResponse = {
        data: {
          status: 200,
          result: {
            postcode: 'M1 1AA',
            country: 'England',
            region: 'North West',
            admin_district: 'Manchester',
            admin_county: 'Greater Manchester',
            admin_ward: 'Piccadilly',
            parish: null,
            parliamentary_constituency: 'Manchester Central',
            longitude: -2.244644,
            latitude: 53.479251
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const address = {
        line1: '1 Test Street',
        line2: 'Test Area',
        city: 'Manchester',
        county: 'Greater Manchester',
        postcode: 'M1 1AA'
      };

      const result = await service.validateAddress(address);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getLocalAuthority', () => {
    it('should return local authority for valid postcode', async () => {
      const mockResponse = {
        data: {
          status: 200,
          result: {
            postcode: 'SW1A 1AA',
            admin_district: 'Westminster'
          }
        }
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const result = await service.getLocalAuthority('SW1A 1AA');

      expect(result).toBe('Westminster');
    });

    it('should return null for invalid postcode', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        response: { status: 404 }
      });

      const result = await service.getLocalAuthority('INVALID');

      expect(result).toBeNull();
    });
  });
});