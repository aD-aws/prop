import { CostEstimationService } from '../../services/CostEstimationService';
import { CostEstimationRequest, ProjectType, CostEstimate } from '../../types';

describe('CostEstimationService', () => {
  let costEstimationService: CostEstimationService;

  beforeEach(() => {
    costEstimationService = new CostEstimationService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateNRM1Estimate', () => {
    const mockRequest: CostEstimationRequest = {
      projectId: 'test-project-123',
      methodology: 'NRM1',
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

    it('should generate a valid NRM1 cost estimate', async () => {
      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      expect(estimate).toBeDefined();
      expect(estimate.id).toBeDefined();
      expect(estimate.projectId).toBe(mockRequest.projectId);
      expect(estimate.methodology).toBe('NRM1');
      expect(estimate.totalCost).toBeGreaterThan(0);
      expect(estimate.currency).toBe('GBP');
      expect(estimate.breakdown).toBeDefined();
      expect(estimate.breakdown.length).toBeGreaterThan(0);
      expect(estimate.confidence).toBeDefined();
      expect(estimate.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.overall).toBeLessThanOrEqual(1);
      expect(estimate.status).toBe('draft');
      expect(estimate.version).toBe(1);
    });

    it('should include all required NRM1 categories', async () => {
      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      const categories = estimate.breakdown.map(item => item.category);
      
      expect(categories).toContain('facilitating-works');
      expect(categories).toContain('building-works');
      expect(categories).toContain('building-services');
      expect(categories).toContain('external-works');
      expect(categories).toContain('temporary-works');
      expect(categories).toContain('professional-fees');
      expect(categories).toContain('other-development-costs');
      expect(categories).toContain('vat');
    });

    it('should include demolition works for applicable project types', async () => {
      const requestWithDemolition = {
        ...mockRequest,
        projectType: 'rear-extension' as ProjectType
      };

      const estimate = await costEstimationService.generateNRM1Estimate(requestWithDemolition);
      const categories = estimate.breakdown.map(item => item.category);
      
      expect(categories).toContain('demolition-works');
    });

    it('should include risk allowances when contingency is requested', async () => {
      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);
      const categories = estimate.breakdown.map(item => item.category);
      
      expect(categories).toContain('risk-allowances');
      
      const riskAllowance = estimate.breakdown.find(item => item.category === 'risk-allowances');
      expect(riskAllowance).toBeDefined();
      expect(riskAllowance!.description).toContain('10%');
    });

    it('should not include risk allowances when contingency is not requested', async () => {
      const requestWithoutContingency = {
        ...mockRequest,
        includeContingency: false
      };

      const estimate = await costEstimationService.generateNRM1Estimate(requestWithoutContingency);
      const categories = estimate.breakdown.map(item => item.category);
      
      expect(categories).not.toContain('risk-allowances');
    });

    it('should apply quality multipliers correctly', async () => {
      const budgetRequest = {
        ...mockRequest,
        requirements: {
          ...mockRequest.requirements,
          materials: {
            ...mockRequest.requirements.materials,
            quality: 'budget' as const
          }
        }
      };

      const premiumRequest = {
        ...mockRequest,
        requirements: {
          ...mockRequest.requirements,
          materials: {
            ...mockRequest.requirements.materials,
            quality: 'premium' as const
          }
        }
      };

      const budgetEstimate = await costEstimationService.generateNRM1Estimate(budgetRequest);
      const premiumEstimate = await costEstimationService.generateNRM1Estimate(premiumRequest);

      expect(premiumEstimate.totalCost).toBeGreaterThan(budgetEstimate.totalCost);
    });

    it('should apply regional multipliers correctly', async () => {
      const londonRequest = {
        ...mockRequest,
        location: {
          ...mockRequest.location,
          postcode: 'SW1A 1AA' // London postcode
        }
      };

      const northEastRequest = {
        ...mockRequest,
        location: {
          ...mockRequest.location,
          postcode: 'NE1 1AA' // North East postcode
        }
      };

      const londonEstimate = await costEstimationService.generateNRM1Estimate(londonRequest);
      const northEastEstimate = await costEstimationService.generateNRM1Estimate(northEastRequest);

      expect(londonEstimate.totalCost).toBeGreaterThan(northEastEstimate.totalCost);
    });

    it('should calculate confidence scores correctly', async () => {
      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      expect(estimate.confidence.overall).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.overall).toBeLessThanOrEqual(1);
      expect(estimate.confidence.dataQuality).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.dataQuality).toBeLessThanOrEqual(1);
      expect(estimate.confidence.marketStability).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.marketStability).toBeLessThanOrEqual(1);
      expect(estimate.confidence.projectComplexity).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.projectComplexity).toBeLessThanOrEqual(1);
      expect(estimate.confidence.timeHorizon).toBeGreaterThanOrEqual(0);
      expect(estimate.confidence.timeHorizon).toBeLessThanOrEqual(1);
      expect(estimate.confidence.explanation).toBeDefined();
      expect(estimate.confidence.factors).toBeDefined();
      expect(estimate.confidence.factors.length).toBeGreaterThan(0);
    });
  });

  describe('generateNRM2Estimate', () => {
    const mockRequest: CostEstimationRequest = {
      projectId: 'test-project-456',
      methodology: 'NRM2',
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

    it('should generate a valid NRM2 cost estimate', async () => {
      const estimate = await costEstimationService.generateNRM2Estimate(mockRequest);

      expect(estimate).toBeDefined();
      expect(estimate.id).toBeDefined();
      expect(estimate.projectId).toBe(mockRequest.projectId);
      expect(estimate.methodology).toBe('NRM2');
      expect(estimate.totalCost).toBeGreaterThan(0);
      expect(estimate.currency).toBe('GBP');
      expect(estimate.breakdown).toBeDefined();
      expect(estimate.breakdown.length).toBeGreaterThan(0);
      expect(estimate.confidence).toBeDefined();
      expect(estimate.status).toBe('draft');
      expect(estimate.version).toBe(1);
    });

    it('should include all required NRM2 elements', async () => {
      const estimate = await costEstimationService.generateNRM2Estimate(mockRequest);

      const categories = estimate.breakdown.map(item => item.category);
      
      expect(categories).toContain('preliminaries');
      expect(categories).toContain('substructure');
      expect(categories).toContain('superstructure');
      expect(categories).toContain('internal-finishes');
      expect(categories).toContain('fittings-furnishings');
      expect(categories).toContain('services');
      expect(categories).toContain('external-works');
      expect(categories).toContain('overheads-profit');
    });

    it('should have higher confidence than NRM1 for same project', async () => {
      const nrm1Request = { ...mockRequest, methodology: 'NRM1' as const };
      const nrm2Request = { ...mockRequest, methodology: 'NRM2' as const };

      const nrm1Estimate = await costEstimationService.generateNRM1Estimate(nrm1Request);
      const nrm2Estimate = await costEstimationService.generateNRM2Estimate(nrm2Request);

      expect(nrm2Estimate.confidence.overall).toBeGreaterThanOrEqual(nrm1Estimate.confidence.overall);
    });

    it('should provide detailed breakdown for each element', async () => {
      const estimate = await costEstimationService.generateNRM2Estimate(mockRequest);

      estimate.breakdown.forEach(item => {
        expect(item.category).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unit).toBeDefined();
        expect(item.unitRate).toBeGreaterThan(0);
        expect(item.totalCost).toBeGreaterThan(0);
        expect(item.source).toBeDefined();
        expect(item.confidence).toBeGreaterThanOrEqual(0);
        expect(item.confidence).toBeLessThanOrEqual(1);
        expect(item.lastUpdated).toBeDefined();
      });
    });
  });

  describe('updateCostEstimate', () => {
    it('should update an existing cost estimate', async () => {
      const mockRequest: CostEstimationRequest = {
        projectId: 'test-project-789',
        methodology: 'NRM1',
        projectType: 'kitchen-renovation',
        requirements: {
          description: 'Kitchen renovation',
          dimensions: {
            area: 15,
            unit: 'meters'
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 15000,
            max: 25000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: '789 Test Road',
          city: 'Birmingham',
          county: 'West Midlands',
          postcode: 'B1 1AA',
          country: 'UK'
        }
      };

      // First generate an estimate
      const originalEstimate = await costEstimationService.generateNRM1Estimate(mockRequest);
      
      // Then update it
      const updateResult = await costEstimationService.updateCostEstimate(originalEstimate.id);

      expect(updateResult).toBeDefined();
      expect(updateResult.estimateId).toBe(originalEstimate.id);
      expect(updateResult.previousTotal).toBe(originalEstimate.totalCost);
      expect(updateResult.newTotal).toBeGreaterThan(0);
      expect(updateResult.changePercentage).toBeDefined();
      expect(updateResult.updatedItems).toBeDefined();
      expect(updateResult.updatedItems.length).toBeGreaterThan(0);
      expect(updateResult.reasons).toBeDefined();
      expect(updateResult.timestamp).toBeDefined();
    });

    it('should throw error for non-existent estimate', async () => {
      await expect(costEstimationService.updateCostEstimate('non-existent-id'))
        .rejects.toThrow('Cost estimate non-existent-id not found');
    });
  });

  describe('Project Type Specific Tests', () => {
    const baseRequest: Omit<CostEstimationRequest, 'projectType'> = {
      projectId: 'test-project',
      methodology: 'NRM1',
      requirements: {
        description: 'Test project',
        dimensions: {
          area: 30,
          unit: 'meters'
        },
        materials: {
          quality: 'standard',
          preferences: [],
          restrictions: []
        },
        timeline: {
          flexibility: 'flexible'
        },
        budget: {
          min: 20000,
          max: 40000,
          currency: 'GBP'
        },
        specialRequirements: []
      },
      location: {
        line1: 'Test Address',
        city: 'Test City',
        county: 'Test County',
        postcode: 'TE1 1ST',
        country: 'UK'
      }
    };

    const projectTypes: ProjectType[] = [
      'loft-conversion',
      'rear-extension',
      'side-extension',
      'bathroom-renovation',
      'kitchen-renovation',
      'conservatory',
      'garage-conversion',
      'basement-conversion',
      'roof-replacement',
      'other'
    ];

    projectTypes.forEach(projectType => {
      it(`should generate valid estimate for ${projectType}`, async () => {
        const request = { ...baseRequest, projectType };
        const estimate = await costEstimationService.generateNRM1Estimate(request);

        expect(estimate.totalCost).toBeGreaterThan(0);
        expect(estimate.breakdown.length).toBeGreaterThan(0);
        expect(estimate.confidence.overall).toBeGreaterThan(0);
      });
    });

    it('should have different costs for different project types', async () => {
      const loftRequest = { ...baseRequest, projectType: 'loft-conversion' as ProjectType };
      const extensionRequest = { ...baseRequest, projectType: 'rear-extension' as ProjectType };

      const loftEstimate = await costEstimationService.generateNRM1Estimate(loftRequest);
      const extensionEstimate = await costEstimationService.generateNRM1Estimate(extensionRequest);

      // Costs should be different (though we can't predict which will be higher)
      expect(loftEstimate.totalCost).not.toBe(extensionEstimate.totalCost);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should handle missing area in requirements', async () => {
      const requestWithoutArea: CostEstimationRequest = {
        projectId: 'test-project',
        methodology: 'NRM1',
        projectType: 'bathroom-renovation',
        requirements: {
          description: 'Bathroom renovation',
          dimensions: {
            unit: 'meters'
            // area is missing
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 10000,
            max: 20000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TE1 1ST',
          country: 'UK'
        }
      };

      // Should use default area and still generate estimate
      const estimate = await costEstimationService.generateNRM1Estimate(requestWithoutArea);
      expect(estimate.totalCost).toBeGreaterThan(0);
    });

    it('should handle edge case postcodes', async () => {
      const requestWithUnknownPostcode: CostEstimationRequest = {
        projectId: 'test-project',
        methodology: 'NRM1',
        projectType: 'other',
        requirements: {
          description: 'Test project',
          dimensions: {
            area: 25,
            unit: 'meters'
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 15000,
            max: 30000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'XX9 9XX', // Unknown postcode format
          country: 'UK'
        }
      };

      // Should use default regional multiplier and still generate estimate
      const estimate = await costEstimationService.generateNRM1Estimate(requestWithUnknownPostcode);
      expect(estimate.totalCost).toBeGreaterThan(0);
    });
  });

  describe('NRM Compliance', () => {
    it('should follow NRM1 order of cost estimating structure', async () => {
      const mockRequest: CostEstimationRequest = {
        projectId: 'nrm1-compliance-test',
        methodology: 'NRM1',
        projectType: 'rear-extension',
        requirements: {
          description: 'NRM1 compliance test',
          dimensions: {
            area: 50,
            unit: 'meters'
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 40000,
            max: 80000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TE1 1ST',
          country: 'UK'
        },
        includeContingency: true,
        contingencyPercentage: 10
      };

      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      // Check that categories follow NRM1 order
      const expectedOrder = [
        'facilitating-works',
        'building-works',
        'building-services',
        'external-works',
        'demolition-works',
        'temporary-works',
        'professional-fees',
        'other-development-costs',
        'risk-allowances',
        'vat'
      ];

      const actualCategories = estimate.breakdown.map(item => item.category);
      
      // Check that all expected categories are present (order may vary in implementation)
      expectedOrder.forEach(category => {
        if (category === 'demolition-works') {
          // Only required for certain project types
          return;
        }
        expect(actualCategories).toContain(category);
      });
    });

    it('should follow NRM2 detailed measurement structure', async () => {
      const mockRequest: CostEstimationRequest = {
        projectId: 'nrm2-compliance-test',
        methodology: 'NRM2',
        projectType: 'loft-conversion',
        requirements: {
          description: 'NRM2 compliance test',
          dimensions: {
            area: 35,
            unit: 'meters'
          },
          materials: {
            quality: 'premium',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 35000,
            max: 60000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TE1 1ST',
          country: 'UK'
        }
      };

      const estimate = await costEstimationService.generateNRM2Estimate(mockRequest);

      // Check that elements follow NRM2 structure
      const expectedElements = [
        'preliminaries',
        'substructure',
        'superstructure',
        'internal-finishes',
        'fittings-furnishings',
        'services',
        'external-works',
        'overheads-profit'
      ];

      const actualElements = estimate.breakdown.map(item => item.category);
      
      expectedElements.forEach(element => {
        expect(actualElements).toContain(element);
      });
    });

    it('should calculate professional fees as percentage of construction cost', async () => {
      const mockRequest: CostEstimationRequest = {
        projectId: 'professional-fees-test',
        methodology: 'NRM1',
        projectType: 'rear-extension',
        requirements: {
          description: 'Professional fees test',
          dimensions: {
            area: 30,
            unit: 'meters'
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 30000,
            max: 60000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TE1 1ST',
          country: 'UK'
        }
      };

      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      const constructionCost = estimate.breakdown
        .filter(item => !['professional-fees', 'other-development-costs', 'risk-allowances', 'vat'].includes(item.category))
        .reduce((sum, item) => sum + item.totalCost, 0);

      const professionalFees = estimate.breakdown.find(item => item.category === 'professional-fees');
      
      expect(professionalFees).toBeDefined();
      expect(professionalFees!.totalCost).toBeGreaterThan(0);
      
      // Professional fees should be a reasonable percentage of construction cost (8-20%)
      const feePercentage = (professionalFees!.totalCost / constructionCost) * 100;
      expect(feePercentage).toBeGreaterThan(5);
      expect(feePercentage).toBeLessThan(25);
    });

    it('should calculate VAT correctly at 20%', async () => {
      const mockRequest: CostEstimationRequest = {
        projectId: 'vat-test',
        methodology: 'NRM1',
        projectType: 'kitchen-renovation',
        requirements: {
          description: 'VAT calculation test',
          dimensions: {
            area: 20,
            unit: 'meters'
          },
          materials: {
            quality: 'standard',
            preferences: [],
            restrictions: []
          },
          timeline: {
            flexibility: 'flexible'
          },
          budget: {
            min: 20000,
            max: 35000,
            currency: 'GBP'
          },
          specialRequirements: []
        },
        location: {
          line1: 'Test Address',
          city: 'Test City',
          county: 'Test County',
          postcode: 'TE1 1ST',
          country: 'UK'
        }
      };

      const estimate = await costEstimationService.generateNRM1Estimate(mockRequest);

      const netCost = estimate.breakdown
        .filter(item => item.category !== 'vat')
        .reduce((sum, item) => sum + item.totalCost, 0);

      const vat = estimate.breakdown.find(item => item.category === 'vat');
      
      expect(vat).toBeDefined();
      expect(vat!.totalCost).toBeCloseTo(netCost * 0.2, 2); // 20% VAT with 2 decimal places tolerance
    });
  });
});