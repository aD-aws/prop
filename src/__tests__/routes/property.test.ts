import request from 'supertest';
import app from '../../app';
import { propertyService } from '../../services/PropertyService';

// Mock the property service
jest.mock('../../services/PropertyService');
const mockPropertyService = propertyService as jest.Mocked<typeof propertyService>;

describe('Property Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/property/validate-address', () => {
    const validAddress = {
      line1: 'Buckingham Palace',
      city: 'London',
      county: 'Greater London',
      postcode: 'SW1A 1AA',
      country: 'England'
    };

    it('should validate a correct address', async () => {
      const mockResult = {
        valid: true,
        errors: [],
        normalizedAddress: {
          ...validAddress,
          postcode: 'SW1A 1AA'
        },
        postcodeResult: {
          valid: true,
          normalizedPostcode: 'SW1A 1AA'
        },
        councilData: {
          success: true,
          data: {
            conservationArea: true,
            listedBuilding: false,
            planningRestrictions: [],
            localAuthority: 'Westminster',
            contactDetails: {
              name: 'Westminster City Council'
            },
            lastChecked: '2024-01-15T10:00:00Z'
          },
          source: 'api' as const,
          lastUpdated: '2024-01-15T10:00:00Z'
        }
      };

      mockPropertyService.validatePropertyAddress.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/property/validate-address')
        .send(validAddress)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.normalizedAddress.postcode).toBe('SW1A 1AA');
      expect(response.body.data.councilData.conservationArea).toBe(true);
    });

    it('should return validation errors for invalid address', async () => {
      const mockResult = {
        valid: false,
        errors: [
          {
            field: 'postcode',
            message: 'Invalid postcode',
            code: 'INVALID_POSTCODE'
          }
        ]
      };

      mockPropertyService.validatePropertyAddress.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/property/validate-address')
        .send({
          ...validAddress,
          postcode: 'INVALID'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_FAILED');
      expect(response.body.data.errors).toHaveLength(1);
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/property/validate-address')
        .send({
          line1: '',
          city: '',
          postcode: ''
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      mockPropertyService.validatePropertyAddress.mockRejectedValueOnce(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/property/validate-address')
        .send(validAddress)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('POST /api/property/validate-postcode', () => {
    it('should validate a correct postcode', async () => {
      const mockResult = {
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
      };

      mockPropertyService.validatePostcode.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/property/validate-postcode')
        .send({ postcode: 'SW1A 1AA' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.data.normalizedPostcode).toBe('SW1A 1AA');
    });

    it('should return error for invalid postcode', async () => {
      const mockResult = {
        valid: false,
        error: 'Invalid postcode format'
      };

      mockPropertyService.validatePostcode.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .post('/api/property/validate-postcode')
        .send({ postcode: 'INVALID' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_POSTCODE');
    });

    it('should return 400 for missing postcode', async () => {
      const response = await request(app)
        .post('/api/property/validate-postcode')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/property/council-data/:postcode', () => {
    it('should return council data for valid postcode', async () => {
      const mockResult = {
        success: true,
        data: {
          conservationArea: true,
          listedBuilding: false,
          planningRestrictions: ['conservation area'],
          localAuthority: 'Westminster',
          contactDetails: {
            name: 'Westminster City Council'
          },
          lastChecked: '2024-01-15T10:00:00Z'
        },
        source: 'api' as const,
        lastUpdated: '2024-01-15T10:00:00Z'
      };

      mockPropertyService.getCouncilDataByPostcode.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .get('/api/property/council-data/SW1A1AA')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.councilData.conservationArea).toBe(true);
      expect(response.body.data.source).toBe('api');
    });

    it('should return error for invalid postcode', async () => {
      const mockResult = {
        success: false,
        error: 'Invalid postcode provided',
        source: 'fallback' as const,
        lastUpdated: '2024-01-15T10:00:00Z'
      };

      mockPropertyService.getCouncilDataByPostcode.mockResolvedValueOnce(mockResult);

      const response = await request(app)
        .get('/api/property/council-data/INVALID')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('COUNCIL_DATA_ERROR');
    });

    it('should validate postcode format in URL', async () => {
      const response = await request(app)
        .get('/api/property/council-data/X')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_POSTCODE');
    });
  });

  describe('DELETE /api/property/council-data/cache/:localAuthority?', () => {
    it('should clear cache for specific local authority', async () => {
      mockPropertyService.refreshCouncilData.mockResolvedValueOnce();

      const response = await request(app)
        .delete('/api/property/council-data/cache/Westminster')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('Westminster');
      expect(mockPropertyService.refreshCouncilData).toHaveBeenCalledWith('Westminster');
    });

    it('should clear all cache when no authority specified', async () => {
      mockPropertyService.refreshCouncilData.mockResolvedValueOnce();

      const response = await request(app)
        .delete('/api/property/council-data/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('All council data cache cleared');
      expect(mockPropertyService.refreshCouncilData).toHaveBeenCalledWith('');
    });
  });

  describe('GET /api/property/health', () => {
    it('should return service health status', async () => {
      const mockHealth = {
        addressValidation: true,
        councilData: true,
        cacheStats: {
          keys: 5,
          hits: 10,
          misses: 2
        }
      };

      mockPropertyService.getServiceHealth.mockResolvedValueOnce(mockHealth);

      const response = await request(app)
        .get('/api/property/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.addressValidation).toBe(true);
      expect(response.body.data.councilData).toBe(true);
      expect(response.body.data.cacheStats.keys).toBe(5);
    });

    it('should handle health check failures', async () => {
      mockPropertyService.getServiceHealth.mockRejectedValueOnce(
        new Error('Health check failed')
      );

      const response = await request(app)
        .get('/api/property/health')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('HEALTH_CHECK_FAILED');
    });
  });

  describe('Request ID handling', () => {
    it('should include request ID in response', async () => {
      mockPropertyService.validatePostcode.mockResolvedValueOnce({
        valid: true,
        postcode: 'SW1A1AA',
        normalizedPostcode: 'SW1A 1AA'
      });

      const response = await request(app)
        .post('/api/property/validate-postcode')
        .set('X-Request-ID', 'test-request-123')
        .send({ postcode: 'SW1A 1AA' })
        .expect(200);

      expect(response.body.requestId).toBe('test-request-123');
      expect(response.headers['x-request-id']).toBe('test-request-123');
    });

    it('should generate request ID if not provided', async () => {
      mockPropertyService.validatePostcode.mockResolvedValueOnce({
        valid: true,
        postcode: 'SW1A1AA',
        normalizedPostcode: 'SW1A 1AA'
      });

      const response = await request(app)
        .post('/api/property/validate-postcode')
        .send({ postcode: 'SW1A 1AA' })
        .expect(200);

      expect(response.body.requestId).toBeDefined();
      expect(response.body.requestId).not.toBe('unknown');
      expect(response.headers['x-request-id']).toBeDefined();
    });
  });
});