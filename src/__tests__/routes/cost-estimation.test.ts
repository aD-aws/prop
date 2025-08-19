import request from 'supertest';
import express from 'express';
import costEstimationRoutes from '../../routes/cost-estimation';
import { authenticateToken } from '../../middleware/auth';
import CostEstimationService from '../../services/CostEstimationService';
import { CostEstimate, CostUpdateResult } from '../../types';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  authenticateToken: jest.fn((req, res, next) => {
    req.user = {
      userId: 'test-user-123',
      email: 'test@example.com',
      userType: 'homeowner',
      iat: Date.now(),
      exp: Date.now() + 3600000
    };
    next();
  })
}));

// Mock the CostEstimationService
jest.mock('../../services/CostEstimationService', () => ({
  generateNRM1Estimate: jest.fn(),
  generateNRM2Estimate: jest.fn(),
  updateCostEstimate: jest.fn()
}));

const mockCostEstimationService = CostEstimationService as jest.Mocked<typeof CostEstimationService>;

describe('Cost Estimation Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/cost', costEstimationRoutes);
    jest.clearAllMocks();
  });

  describe('POST /api/cost/estimate/nrm1', () => {
    const validRequest = {
      projectId: 'test-project-123',
      projectType: 'rear-extension',
      requirements: {
        description: 'Single storey rear extension',
        dimensions: {
          length: 6,
          width: 4,
          height: 3,
          area: 24,
          unit: 'meters'
        },
        materials: {
          quality: 'standard',
          preferences: ['brick', 'tile roof'],
          restrictions: []
        },
        timeline: {
          startDate: '2024-06-01',
          endDate: '2024-09-01',
          flexibility: 'flexible'
        },
        budget: {
          min: 30000,
          max: 50000,
          currency: 'GBP'
        },
        specialRequirements: []
      },
      location: {
        line1: '123 Test Street',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      },
      includeContingency: true,
      contingencyPercentage: 10
    };

    const mockEstimate: CostEstimate = {
      id: 'estimate-123',
      projectId: 'test-project-123',
      methodology: 'NRM1',
      totalCost: 45000,
      currency: 'GBP',
      breakdown: [
        {
          category: 'building-works',
          description: 'Main construction works',
          quantity: 24,
          unit: 'm²',
          unitRate: 1500,
          totalCost: 36000,
          source: {
            provider: 'Test Provider',
            type: 'database',
            reliability: 0.8,
            lastUpdated: '2024-01-01T00:00:00.000Z',
            coverage: 'London'
          },
          confidence: 0.8,
          lastUpdated: '2024-01-01T00:00:00.000Z'
        }
      ],
      confidence: {
        overall: 0.8,
        dataQuality: 0.8,
        marketStability: 0.7,
        projectComplexity: 0.8,
        timeHorizon: 0.9,
        explanation: 'High confidence estimate',
        factors: []
      },
      marketRates: {
        region: 'London',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        source: 'Test Source',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: '2024-01-01T00:00:00.000Z',
      validUntil: '2024-02-01T00:00:00.000Z',
      version: 1,
      status: 'draft'
    };

    it('should generate NRM1 estimate successfully', async () => {
      mockCostEstimationService.generateNRM1Estimate.mockResolvedValue(mockEstimate);

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEstimate);
      expect(response.body.timestamp).toBeDefined();
      expect(mockCostEstimationService.generateNRM1Estimate).toHaveBeenCalledWith({
        ...validRequest,
        methodology: 'NRM1'
      });
    });

    it('should return validation error for missing projectId', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).projectId;

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('projectId')
        ])
      );
    });

    it('should return validation error for invalid project type', async () => {
      const invalidRequest = {
        ...validRequest,
        projectType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toEqual(
        expect.arrayContaining([
          expect.stringContaining('projectType')
        ])
      );
    });

    it('should return validation error for missing requirements', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).requirements;

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid quality level', async () => {
      const invalidRequest = {
        ...validRequest,
        requirements: {
          ...validRequest.requirements,
          materials: {
            ...validRequest.requirements.materials,
            quality: 'invalid-quality'
          }
        }
      };

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for missing location', async () => {
      const invalidRequest = { ...validRequest };
      delete (invalidRequest as any).location;

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      mockCostEstimationService.generateNRM1Estimate.mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ESTIMATION_ERROR');
      expect(response.body.error.message).toBe('Failed to generate cost estimate');
    });

    it('should accept optional contingency parameters', async () => {
      const requestWithoutContingency = {
        ...validRequest,
        includeContingency: false
      };

      mockCostEstimationService.generateNRM1Estimate.mockResolvedValue(mockEstimate);

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send(requestWithoutContingency)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(mockCostEstimationService.generateNRM1Estimate).toHaveBeenCalledWith({
        ...requestWithoutContingency,
        methodology: 'NRM1'
      });
    });
  });

  describe('POST /api/cost/estimate/nrm2', () => {
    const validRequest = {
      projectId: 'test-project-456',
      projectType: 'loft-conversion',
      requirements: {
        description: 'Loft conversion with dormer',
        dimensions: {
          length: 8,
          width: 5,
          height: 2.5,
          area: 40,
          unit: 'meters'
        },
        materials: {
          quality: 'premium',
          preferences: ['hardwood floors', 'velux windows'],
          restrictions: ['no steel frame']
        },
        timeline: {
          startDate: '2024-05-01',
          endDate: '2024-08-01',
          flexibility: 'rigid'
        },
        budget: {
          min: 40000,
          max: 70000,
          currency: 'GBP'
        },
        specialRequirements: ['structural calculations required']
      },
      location: {
        line1: '456 Test Avenue',
        city: 'Manchester',
        county: 'Greater Manchester',
        postcode: 'M1 1AA',
        country: 'UK'
      }
    };

    const mockEstimate: CostEstimate = {
      id: 'estimate-456',
      projectId: 'test-project-456',
      methodology: 'NRM2',
      totalCost: 55000,
      currency: 'GBP',
      breakdown: [
        {
          category: 'superstructure',
          description: 'Frame, upper floors, roof, external walls, windows',
          quantity: 40,
          unit: 'm²',
          unitRate: 1200,
          totalCost: 48000,
          source: {
            provider: 'Test Provider',
            type: 'database',
            reliability: 0.9,
            lastUpdated: '2024-01-01T00:00:00.000Z',
            coverage: 'Manchester'
          },
          confidence: 0.9,
          lastUpdated: '2024-01-01T00:00:00.000Z'
        }
      ],
      confidence: {
        overall: 0.85,
        dataQuality: 0.9,
        marketStability: 0.8,
        projectComplexity: 0.8,
        timeHorizon: 0.9,
        explanation: 'High confidence estimate using NRM2 methodology',
        factors: []
      },
      marketRates: {
        region: 'North West',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        source: 'Test Source',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: '2024-01-01T00:00:00.000Z',
      validUntil: '2024-02-01T00:00:00.000Z',
      version: 1,
      status: 'draft'
    };

    it('should generate NRM2 estimate successfully', async () => {
      mockCostEstimationService.generateNRM2Estimate.mockResolvedValue(mockEstimate);

      const response = await request(app)
        .post('/api/cost/estimate/nrm2')
        .send(validRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockEstimate);
      expect(mockCostEstimationService.generateNRM2Estimate).toHaveBeenCalledWith({
        ...validRequest,
        methodology: 'NRM2'
      });
    });

    it('should return validation error for invalid input', async () => {
      const invalidRequest = {
        ...validRequest,
        projectType: 'invalid-type'
      };

      const response = await request(app)
        .post('/api/cost/estimate/nrm2')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors gracefully', async () => {
      mockCostEstimationService.generateNRM2Estimate.mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/cost/estimate/nrm2')
        .send(validRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ESTIMATION_ERROR');
    });
  });

  describe('PUT /api/cost/estimate/:estimateId/update', () => {
    const mockUpdateResult: CostUpdateResult = {
      estimateId: 'estimate-123',
      previousTotal: 45000,
      newTotal: 47250,
      changePercentage: 5.0,
      updatedItems: ['building-works', 'building-services'],
      reasons: ['building-works: +3.2% due to market rate changes', 'building-services: +7.1% due to market rate changes'],
      timestamp: '2024-01-02T00:00:00.000Z'
    };

    it('should update cost estimate successfully', async () => {
      mockCostEstimationService.updateCostEstimate.mockResolvedValue(mockUpdateResult);

      const response = await request(app)
        .put('/api/cost/estimate/estimate-123/update')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockUpdateResult);
      expect(mockCostEstimationService.updateCostEstimate).toHaveBeenCalledWith('estimate-123');
    });

    it('should return validation error for missing estimate ID', async () => {
      const response = await request(app)
        .put('/api/cost/estimate//update')
        .expect(404);

      // Express will return 404 for missing route parameter
    });

    it('should handle service errors gracefully', async () => {
      mockCostEstimationService.updateCostEstimate.mockRejectedValue(
        new Error('Estimate not found')
      );

      const response = await request(app)
        .put('/api/cost/estimate/non-existent/update')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UPDATE_ERROR');
    });
  });

  describe('GET /api/cost/estimate/:estimateId', () => {
    it('should return not implemented response', async () => {
      const response = await request(app)
        .get('/api/cost/estimate/estimate-123')
        .expect(501);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_IMPLEMENTED');
      expect(response.body.error.message).toContain('not yet implemented');
    });

    it('should return validation error for missing estimate ID', async () => {
      const response = await request(app)
        .get('/api/cost/estimate/')
        .expect(404);

      // Express will return 404 for missing route parameter
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Reset the mock to require authentication
      (authenticateToken as jest.Mock).mockImplementation((req, res, next) => {
        if (!req.headers.authorization) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'UNAUTHORIZED',
              message: 'Authentication required'
            }
          });
        }
        req.user = {
          userId: 'test-user-123',
          email: 'test@example.com',
          userType: 'homeowner',
          iat: Date.now(),
          exp: Date.now() + 3600000
        };
        next();
      });
    });

    it('should require authentication for NRM1 estimate generation', async () => {
      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require authentication for NRM2 estimate generation', async () => {
      const response = await request(app)
        .post('/api/cost/estimate/nrm2')
        .send({})
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require authentication for estimate updates', async () => {
      const response = await request(app)
        .put('/api/cost/estimate/estimate-123/update')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should require authentication for estimate retrieval', async () => {
      const response = await request(app)
        .get('/api/cost/estimate/estimate-123')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Request ID Handling', () => {
    it('should include request ID in response', async () => {
      mockCostEstimationService.generateNRM1Estimate.mockResolvedValue({
        id: 'estimate-123',
        projectId: 'test-project-123',
        methodology: 'NRM1',
        totalCost: 45000,
        currency: 'GBP',
        breakdown: [],
        confidence: {
          overall: 0.8,
          dataQuality: 0.8,
          marketStability: 0.7,
          projectComplexity: 0.8,
          timeHorizon: 0.9,
          explanation: 'Test',
          factors: []
        },
        marketRates: {
          region: 'Test',
          lastUpdated: '2024-01-01T00:00:00.000Z',
          source: 'Test',
          rates: [],
          labourRates: [],
          overheadFactors: []
        },
        lastUpdated: '2024-01-01T00:00:00.000Z',
        validUntil: '2024-02-01T00:00:00.000Z',
        version: 1,
        status: 'draft'
      });

      const response = await request(app)
        .post('/api/cost/estimate/nrm1')
        .set('X-Request-ID', 'test-request-123')
        .set('Authorization', 'Bearer test-token')
        .send({
          projectId: 'test-project-123',
          projectType: 'rear-extension',
          requirements: {
            description: 'Test',
            dimensions: { area: 24, unit: 'meters' },
            materials: { quality: 'standard', preferences: [], restrictions: [] },
            timeline: { flexibility: 'flexible' },
            budget: { min: 30000, max: 50000, currency: 'GBP' },
            specialRequirements: []
          },
          location: {
            line1: '123 Test Street',
            city: 'London',
            county: 'Greater London',
            postcode: 'SW1A 1AA',
            country: 'UK'
          }
        })
        .expect(201);

      expect(response.body.requestId).toBe('test-request-123');
    });
  });
});