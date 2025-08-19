import { CouncilDataService } from '../../services/CouncilDataService';
import { PostcodeAddress } from '../../types';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('CouncilDataService', () => {
  let service: CouncilDataService;

  beforeEach(() => {
    service = new CouncilDataService();
    jest.clearAllMocks();
    // Clear cache before each test
    service.clearCache();
  });

  const mockAddress: PostcodeAddress = {
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
  };

  describe('getCouncilData', () => {
    it('should return council data for known council', async () => {
      // Mock successful council website response
      const mockHtml = `
        <html>
          <head><title>Westminster City Council</title></head>
          <body>
            <p>Contact us: 020 7641 6000</p>
            <p>Email: info@westminster.gov.uk</p>
            <a href="/planning">Planning Applications</a>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtml
      });

      const result = await service.getCouncilData(mockAddress);

      expect(result.success).toBe(true);
      expect(result.data?.localAuthority).toBe('Westminster');
      expect(result.data?.contactDetails.name).toContain('Westminster');
      expect(result.source).toBe('api');
    });

    it('should return cached data on subsequent calls', async () => {
      // Mock first call - need to mock multiple calls for conservation area and planning checks
      const mockHtml = '<html><head><title>Westminster City Council</title></head></html>';
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      // First call
      const result1 = await service.getCouncilData(mockAddress);
      expect(result1.source).toBe('api');

      // Clear mock call count
      mockedAxios.get.mockClear();

      // Second call should use cache
      const result2 = await service.getCouncilData(mockAddress);
      expect(result2.source).toBe('cache');
      expect(result2.data).toEqual(result1.data);

      // Axios should not be called for cached data
      expect(mockedAxios.get).toHaveBeenCalledTimes(0);
    });

    it('should return basic data when council website fails', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      const result = await service.getCouncilData(mockAddress);

      // Service should still succeed but with basic data
      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
      expect(result.data?.localAuthority).toBe('Westminster');
      expect(result.data?.conservationArea).toBe(false);
      expect(result.data?.listedBuilding).toBe(false);
      expect(result.data?.planningRestrictions).toEqual([]);
    });

    it('should handle unknown council gracefully', async () => {
      const unknownAddress: PostcodeAddress = {
        ...mockAddress,
        adminDistrict: 'Unknown Council'
      };

      // Mock failed website lookup
      mockedAxios.get.mockRejectedValue(new Error('Not found'));

      const result = await service.getCouncilData(unknownAddress);

      // Service should still succeed but with basic data
      expect(result.success).toBe(true);
      expect(result.source).toBe('api');
      expect(result.data?.localAuthority).toBe('Unknown Council');
      expect(result.data?.conservationArea).toBe(false);
      expect(result.data?.listedBuilding).toBe(false);
    });
  });

  describe('cache management', () => {
    it('should clear cache for specific local authority', async () => {
      // Mock response
      const mockHtml = '<html><head><title>Westminster City Council</title></head></html>';
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      // Make initial call to populate cache
      await service.getCouncilData(mockAddress);
      
      // Clear mock call count
      mockedAxios.get.mockClear();
      
      // Clear cache for Westminster
      service.clearCache('Westminster');

      // Next call should hit API again, not cache
      const result = await service.getCouncilData(mockAddress);
      expect(result.source).toBe('api');
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('should clear all cache', async () => {
      // Mock response
      const mockHtml = '<html><head><title>Test Council</title></head></html>';
      mockedAxios.get.mockResolvedValue({
        status: 200,
        data: mockHtml
      });

      // Make calls for different councils
      await service.getCouncilData(mockAddress);
      await service.getCouncilData({
        ...mockAddress,
        adminDistrict: 'Camden'
      });

      // Clear all cache
      service.clearCache();

      // Next calls should hit API again
      const result1 = await service.getCouncilData(mockAddress);
      const result2 = await service.getCouncilData({
        ...mockAddress,
        adminDistrict: 'Camden'
      });

      expect(result1.source).toBe('api');
      expect(result2.source).toBe('api');
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(typeof stats.keys).toBe('number');
    });
  });

  describe('conservation area checking', () => {
    it('should detect conservation area from council website', async () => {
      const mockHtml = `
        <html>
          <body>
            <div>Conservation areas in SW1A include...</div>
            <p>St James's conservation area covers SW1A 1AA</p>
          </body>
        </html>
      `;

      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: '<html><head><title>Westminster City Council</title></head></html>'
        })
        .mockResolvedValueOnce({
          status: 200,
          data: mockHtml
        });

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.conservationArea).toBe(true);
    });

    it('should handle conservation area page not found', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: '<html><head><title>Westminster City Council</title></head></html>'
        })
        .mockRejectedValueOnce(new Error('Page not found'));

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.conservationArea).toBe(false);
    });
  });

  describe('planning restrictions detection', () => {
    it('should detect planning restrictions from council website', async () => {
      const mockMainHtml = '<html><head><title>Westminster City Council</title></head></html>';
      const mockPlanningHtml = `
        <html>
          <body>
            <div>Planning information</div>
            <p>This area has Article 4 directions in place</p>
            <p>Tree preservation orders apply</p>
            <p>Conservation area restrictions</p>
          </body>
        </html>
      `;

      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: mockMainHtml
        })
        .mockRejectedValueOnce(new Error('Conservation area page not found'))
        .mockResolvedValueOnce({
          status: 200,
          data: mockPlanningHtml
        });

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.planningRestrictions).toContain('article 4');
      expect(result.data?.planningRestrictions).toContain('tree preservation');
      expect(result.data?.planningRestrictions).toContain('conservation area');
    });

    it('should handle planning page not available', async () => {
      mockedAxios.get
        .mockResolvedValueOnce({
          status: 200,
          data: '<html><head><title>Westminster City Council</title></head></html>'
        })
        .mockRejectedValueOnce(new Error('Planning page not found'));

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.planningRestrictions).toEqual([]);
    });
  });

  describe('contact details extraction', () => {
    it('should extract contact details from council website', async () => {
      const mockHtml = `
        <html>
          <head><title>Westminster City Council | Official Website</title></head>
          <body>
            <p>Contact us on 020 7641 6000</p>
            <p>Email us at info@westminster.gov.uk</p>
            <p>Alternative number: +44 20 7641 6001</p>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtml
      });

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.contactDetails.name).toBe('Westminster City Council');
      expect(result.data?.contactDetails.phone).toMatch(/020 7641 6000|020 7641 6001/);
      expect(result.data?.contactDetails.email).toBe('info@westminster.gov.uk');
    });

    it('should handle missing contact information gracefully', async () => {
      const mockHtml = `
        <html>
          <head><title>Test Council</title></head>
          <body>
            <p>Welcome to our website</p>
          </body>
        </html>
      `;

      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        data: mockHtml
      });

      const result = await service.getCouncilData(mockAddress);

      expect(result.data?.contactDetails.name).toBe('Test Council');
      expect(result.data?.contactDetails.phone).toBeUndefined();
      expect(result.data?.contactDetails.email).toBeUndefined();
    });
  });
});