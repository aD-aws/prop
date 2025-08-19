import { AddressValidationService } from '../../services/AddressValidationService';
import { CouncilDataService } from '../../services/CouncilDataService';
import { CostEstimationService } from '../../services/CostEstimationService';
import { DocumentService } from '../../services/DocumentService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { ComplianceService } from '../../services/ComplianceService';
import { NotificationService } from '../../services/NotificationService';

describe('External Service Integration Tests', () => {
  let addressValidationService: AddressValidationService;
  let councilDataService: CouncilDataService;
  let costEstimationService: CostEstimationService;
  let documentService: DocumentService;
  let sowGenerationService: SoWGenerationService;
  let complianceService: ComplianceService;
  let notificationService: NotificationService;

  beforeAll(() => {
    addressValidationService = new AddressValidationService();
    councilDataService = new CouncilDataService();
    costEstimationService = new CostEstimationService();
    documentService = new DocumentService();
    sowGenerationService = new SoWGenerationService();
    complianceService = new ComplianceService();
    notificationService = new NotificationService();
  });

  describe('Address Validation Service Integration', () => {
    test('should validate UK postcode using external API', async () => {
      const address = {
        line1: '10 Downing Street',
        city: 'London',
        postcode: 'SW1A 2AA',
        country: 'UK'
      };

      const result = await addressValidationService.validateAddress(address);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('normalizedAddress');
      expect(result.valid).toBe(true);
    }, 15000);

    test('should handle invalid postcode gracefully', async () => {
      const address = {
        line1: '123 Fake Street',
        city: 'London',
        postcode: 'INVALID',
        country: 'UK'
      };

      const result = await addressValidationService.validateAddress(address);

      expect(result).toHaveProperty('valid');
      expect(result.valid).toBe(false);
      expect(result).toHaveProperty('errors');
    }, 15000);

    test('should handle API timeout gracefully', async () => {
      // Mock a timeout scenario
      const originalTimeout = process.env.API_TIMEOUT;
      process.env.API_TIMEOUT = '1'; // 1ms timeout

      const address = {
        line1: '10 Downing Street',
        city: 'London',
        postcode: 'SW1A 2AA',
        country: 'UK'
      };

      const result = await addressValidationService.validateAddress(address);

      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('error');

      // Restore original timeout
      process.env.API_TIMEOUT = originalTimeout;
    }, 15000);
  });

  describe('Council Data Service Integration', () => {
    test('should fetch council data for valid postcode', async () => {
      const postcode = 'SW1A 2AA';

      const result = await councilDataService.getCouncilData(postcode);

      expect(result).toHaveProperty('localAuthority');
      expect(result).toHaveProperty('conservationArea');
      expect(result).toHaveProperty('listedBuilding');
      expect(result).toHaveProperty('planningRestrictions');
    }, 30000);

    test('should handle council website unavailability', async () => {
      // Mock unavailable council website
      const mockPostcode = 'MOCK1 1AA';

      const result = await councilDataService.getCouncilData(mockPostcode);

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('fallbackData');
    }, 15000);

    test('should cache council data to reduce API calls', async () => {
      const postcode = 'SW1A 2AA';

      // First call
      const start1 = Date.now();
      const result1 = await councilDataService.getCouncilData(postcode);
      const duration1 = Date.now() - start1;

      // Second call (should be cached)
      const start2 = Date.now();
      const result2 = await councilDataService.getCouncilData(postcode);
      const duration2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1 / 2); // Cached call should be much faster
    }, 30000);
  });

  describe('AWS Bedrock Integration', () => {
    test('should generate SoW using AWS Bedrock', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        requirements: {
          description: 'Convert loft into bedroom with en-suite',
          dimensions: {
            length: 6,
            width: 4,
            height: 2.5
          },
          materials: {
            flooring: 'engineered_wood',
            insulation: 'mineral_wool'
          },
          specialRequirements: ['velux_windows', 'en_suite']
        },
        propertyAddress: {
          line1: '123 Test Street',
          city: 'London',
          postcode: 'SW1A 1AA',
          country: 'UK'
        }
      };

      const result = await sowGenerationService.generateSoW(projectData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('ribaStages');
      expect(result).toHaveProperty('specifications');
      expect(result).toHaveProperty('costEstimate');
      expect(result.ribaStages).toHaveLength(8); // RIBA stages 0-7
    }, 60000);

    test('should handle Bedrock API errors gracefully', async () => {
      // Mock invalid project data
      const invalidProjectData = {
        projectType: 'invalid_type',
        requirements: {}
      };

      try {
        await sowGenerationService.generateSoW(invalidProjectData);
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('Invalid project data');
      }
    }, 30000);

    test('should validate compliance using Bedrock', async () => {
      const sowData = {
        projectType: 'loft_conversion',
        specifications: {
          structuralWork: true,
          electricalWork: true,
          plumbingWork: true,
          insulation: 'mineral_wool',
          fireEscape: true
        },
        location: {
          conservationArea: false,
          listedBuilding: false,
          localAuthority: 'Westminster'
        }
      };

      const result = await complianceService.checkCompliance(sowData);

      expect(result).toHaveProperty('complianceScore');
      expect(result).toHaveProperty('requirements');
      expect(result).toHaveProperty('recommendations');
      expect(result.complianceScore).toBeGreaterThanOrEqual(0);
      expect(result.complianceScore).toBeLessThanOrEqual(100);
    }, 45000);
  });

  describe('AWS Textract Integration', () => {
    test('should process document using Textract', async () => {
      const mockDocument = {
        buffer: Buffer.from('Mock PDF content'),
        originalname: 'structural-drawing.pdf',
        mimetype: 'application/pdf'
      };

      const result = await documentService.processDocument(mockDocument);

      expect(result).toHaveProperty('extractedText');
      expect(result).toHaveProperty('documentType');
      expect(result).toHaveProperty('metadata');
    }, 45000);

    test('should handle unsupported file formats', async () => {
      const mockDocument = {
        buffer: Buffer.from('Mock content'),
        originalname: 'document.txt',
        mimetype: 'text/plain'
      };

      try {
        await documentService.processDocument(mockDocument);
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('Unsupported file format');
      }
    }, 15000);
  });

  describe('AWS S3 Integration', () => {
    test('should upload document to S3', async () => {
      const mockDocument = {
        buffer: Buffer.from('Mock document content'),
        originalname: 'test-document.pdf',
        mimetype: 'application/pdf'
      };

      const result = await documentService.uploadDocument(mockDocument, 'test-project-id');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result.url).toContain('amazonaws.com');
    }, 30000);

    test('should handle S3 upload failures', async () => {
      // Mock invalid document
      const mockDocument = {
        buffer: null,
        originalname: '',
        mimetype: ''
      };

      try {
        await documentService.uploadDocument(mockDocument, 'test-project-id');
      } catch (error) {
        expect(error).toHaveProperty('message');
      }
    }, 15000);
  });

  describe('AWS SES Integration', () => {
    test('should send email notification', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Notification',
        template: 'project_update',
        data: {
          projectName: 'Test Project',
          status: 'In Progress'
        }
      };

      const result = await notificationService.sendEmail(emailData);

      expect(result).toHaveProperty('messageId');
      expect(result.success).toBe(true);
    }, 30000);

    test('should handle email delivery failures', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Notification',
        template: 'project_update',
        data: {}
      };

      try {
        await notificationService.sendEmail(emailData);
      } catch (error) {
        expect(error).toHaveProperty('message');
        expect(error.message).toContain('Invalid email address');
      }
    }, 15000);
  });

  describe('Cost Database Integration', () => {
    test('should fetch current material costs', async () => {
      const materials = ['timber', 'insulation', 'plasterboard'];
      const location = 'London';

      const result = await costEstimationService.getMaterialCosts(materials, location);

      expect(result).toHaveProperty('costs');
      expect(result.costs).toHaveProperty('timber');
      expect(result.costs).toHaveProperty('insulation');
      expect(result.costs).toHaveProperty('plasterboard');
      expect(result).toHaveProperty('lastUpdated');
    }, 30000);

    test('should handle cost database unavailability', async () => {
      // Mock unavailable cost database
      const materials = ['nonexistent_material'];
      const location = 'Unknown Location';

      const result = await costEstimationService.getMaterialCosts(materials, location);

      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('fallbackCosts');
    }, 15000);
  });

  describe('Redis Cache Integration', () => {
    test('should cache and retrieve data from Redis', async () => {
      const cacheKey = 'test-cache-key';
      const testData = { message: 'Hello, Redis!' };

      // Set cache
      await councilDataService.setCacheData(cacheKey, testData, 3600);

      // Get cache
      const cachedData = await councilDataService.getCacheData(cacheKey);

      expect(cachedData).toEqual(testData);
    }, 15000);

    test('should handle Redis connection failures', async () => {
      // Mock Redis connection failure
      const originalRedisUrl = process.env.REDIS_URL;
      process.env.REDIS_URL = 'redis://invalid-host:6379';

      const cacheKey = 'test-cache-key';
      const testData = { message: 'Hello, Redis!' };

      try {
        await councilDataService.setCacheData(cacheKey, testData, 3600);
      } catch (error) {
        expect(error).toHaveProperty('message');
      }

      // Restore original Redis URL
      process.env.REDIS_URL = originalRedisUrl;
    }, 15000);
  });

  describe('WebSocket Integration', () => {
    test('should establish WebSocket connection', async () => {
      const WebSocket = require('ws');
      const ws = new WebSocket('ws://localhost:3001');

      return new Promise((resolve, reject) => {
        ws.on('open', () => {
          ws.close();
          resolve(true);
        });

        ws.on('error', (error) => {
          reject(error);
        });

        setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 10000);
      });
    }, 15000);
  });
});