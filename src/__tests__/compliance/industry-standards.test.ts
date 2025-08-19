import { ComplianceService } from '../../services/ComplianceService';
import { SoWGenerationService } from '../../services/SoWGenerationService';
import { CostEstimationService } from '../../services/CostEstimationService';

describe('Industry Standards Compliance Tests', () => {
  let complianceService: ComplianceService;
  let sowGenerationService: SoWGenerationService;
  let costEstimationService: CostEstimationService;

  beforeAll(() => {
    complianceService = new ComplianceService();
    sowGenerationService = new SoWGenerationService();
    costEstimationService = new CostEstimationService();
  });

  describe('RICS Professional Standards Compliance', () => {
    test('should validate RICS surveying standards for structural assessments', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        specifications: {
          structuralWork: true,
          loadBearingChanges: true,
          steelBeams: true,
          foundationWork: false
        },
        location: {
          conservationArea: false,
          listedBuilding: false,
          localAuthority: 'Westminster'
        }
      };

      const result = await complianceService.validateRICSStandards(projectData);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('requirements');
      expect(result.requirements).toContain('Structural engineer assessment required');
      expect(result.requirements).toContain('RICS building survey recommended');
      expect(result.requirements).toContain('Professional indemnity insurance verification');
    });

    test('should enforce RICS valuation standards for cost estimates', async () => {
      const valuationData = {
        propertyType: 'residential',
        location: 'London',
        improvements: {
          type: 'loft_conversion',
          area: 24, // square meters
          quality: 'standard'
        },
        marketConditions: {
          date: new Date().toISOString(),
          localMarketTrend: 'stable'
        }
      };

      const result = await complianceService.validateRICSValuation(valuationData);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('methodology');
      expect(result.methodology).toContain('RICS Red Book');
      expect(result).toHaveProperty('addedValue');
      expect(result.addedValue).toBeGreaterThan(0);
    });

    test('should validate RICS heritage standards for conservation areas', async () => {
      const heritageProject = {
        projectType: 'extension',
        location: {
          conservationArea: true,
          listedBuilding: false,
          localAuthority: 'Camden'
        },
        specifications: {
          materials: 'traditional_brick',
          roofing: 'slate',
          windows: 'timber_sash'
        }
      };

      const result = await complianceService.validateRICSHeritage(heritageProject);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('requirements');
      expect(result.requirements).toContain('Conservation area consent required');
      expect(result.requirements).toContain('Heritage impact assessment');
      expect(result.requirements).toContain('Traditional materials specification');
    });
  });

  describe('NRM1 Order of Cost Estimating Compliance', () => {
    test('should follow NRM1 structure for cost estimates', async () => {
      const projectData = {
        projectType: 'extension',
        dimensions: {
          length: 4,
          width: 3,
          height: 3,
          area: 12 // square meters
        },
        specifications: {
          foundations: 'concrete_strip',
          walls: 'cavity_brick',
          roof: 'pitched_tiles',
          windows: 'upvc_double_glazed',
          doors: 'composite'
        },
        location: 'Manchester'
      };

      const result = await costEstimationService.generateNRM1Estimate(projectData);

      expect(result).toHaveProperty('methodology', 'NRM1');
      expect(result).toHaveProperty('costBreakdown');
      
      // Validate NRM1 cost categories
      const breakdown = result.costBreakdown;
      expect(breakdown).toHaveProperty('facilitatingWorks');
      expect(breakdown).toHaveProperty('buildingWorks');
      expect(breakdown).toHaveProperty('buildingServicesWorks');
      expect(breakdown).toHaveProperty('externalWorks');
      expect(breakdown).toHaveProperty('preliminaries');
      expect(breakdown).toHaveProperty('overheadsAndProfit');
      expect(breakdown).toHaveProperty('riskAllowances');

      // Validate cost per square meter is within reasonable range
      const costPerSqm = result.totalCost / projectData.dimensions.area;
      expect(costPerSqm).toBeGreaterThan(800); // Minimum £800/sqm
      expect(costPerSqm).toBeLessThan(3000); // Maximum £3000/sqm
    });

    test('should include appropriate risk allowances per NRM1', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        complexity: 'high',
        dimensions: { area: 20 },
        location: 'London'
      };

      const result = await costEstimationService.generateNRM1Estimate(projectData);

      expect(result.costBreakdown.riskAllowances).toHaveProperty('designDevelopment');
      expect(result.costBreakdown.riskAllowances).toHaveProperty('construction');
      expect(result.costBreakdown.riskAllowances).toHaveProperty('employer');

      // High complexity should have higher risk allowances
      const totalRisk = Object.values(result.costBreakdown.riskAllowances)
        .reduce((sum: number, value: any) => sum + (typeof value === 'number' ? value : 0), 0);
      
      expect(totalRisk / result.totalCost).toBeGreaterThan(0.15); // At least 15% risk allowance
    });
  });

  describe('NRM2 Detailed Measurement Compliance', () => {
    test('should follow NRM2 measurement rules for quantities', async () => {
      const projectData = {
        projectType: 'extension',
        specifications: {
          excavation: {
            type: 'strip_foundations',
            depth: 1.2,
            width: 0.6,
            length: 14 // perimeter
          },
          concrete: {
            type: 'C25_ready_mix',
            volume: 2.5
          },
          brickwork: {
            type: 'facing_brick',
            area: 45,
            mortar: 'cement_lime'
          }
        }
      };

      const result = await costEstimationService.generateNRM2Measurement(projectData);

      expect(result).toHaveProperty('methodology', 'NRM2');
      expect(result).toHaveProperty('measurements');

      // Validate measurement units per NRM2
      expect(result.measurements.excavation.unit).toBe('m³');
      expect(result.measurements.concrete.unit).toBe('m³');
      expect(result.measurements.brickwork.unit).toBe('m²');

      // Validate measurement descriptions
      expect(result.measurements.excavation.description).toContain('Excavating');
      expect(result.measurements.concrete.description).toContain('In-situ concrete');
      expect(result.measurements.brickwork.description).toContain('Facing brickwork');
    });

    test('should include all NRM2 required measurement information', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        specifications: {
          roofing: {
            type: 'concrete_tiles',
            area: 30,
            pitch: 35
          }
        }
      };

      const result = await costEstimationService.generateNRM2Measurement(projectData);

      const roofingMeasurement = result.measurements.roofing;
      
      expect(roofingMeasurement).toHaveProperty('description');
      expect(roofingMeasurement).toHaveProperty('unit');
      expect(roofingMeasurement).toHaveProperty('quantity');
      expect(roofingMeasurement).toHaveProperty('rate');
      expect(roofingMeasurement).toHaveProperty('amount');
      
      // Should include pitch in description for roofing
      expect(roofingMeasurement.description).toContain('35°');
    });
  });

  describe('RIBA Plan of Work Compliance', () => {
    test('should structure SoW according to RIBA stages', async () => {
      const projectData = {
        projectType: 'extension',
        requirements: {
          description: 'Single storey rear extension',
          dimensions: { length: 4, width: 3, height: 3 },
          materials: { walls: 'brick', roof: 'tiles' }
        }
      };

      const result = await sowGenerationService.generateSoW(projectData);

      expect(result).toHaveProperty('ribaStages');
      expect(result.ribaStages).toHaveLength(8); // Stages 0-7

      // Validate each RIBA stage
      const stageNames = [
        'Strategic Definition',
        'Preparation and Briefing',
        'Concept Design',
        'Spatial Coordination',
        'Technical Design',
        'Manufacturing and Construction',
        'Handover',
        'In Use'
      ];

      result.ribaStages.forEach((stage, index) => {
        expect(stage.stage).toBe(index);
        expect(stage.title).toBe(stageNames[index]);
        expect(stage).toHaveProperty('description');
        expect(stage).toHaveProperty('deliverables');
        expect(stage.deliverables).toBeInstanceOf(Array);
      });
    });

    test('should include appropriate deliverables for each RIBA stage', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        requirements: {
          description: 'Loft conversion with dormer',
          structuralWork: true
        }
      };

      const result = await sowGenerationService.generateSoW(projectData);

      // Stage 2 (Concept Design) should include specific deliverables
      const conceptStage = result.ribaStages.find(stage => stage.stage === 2);
      expect(conceptStage.deliverables).toContain('Concept design drawings');
      expect(conceptStage.deliverables).toContain('Planning strategy');
      expect(conceptStage.deliverables).toContain('Structural concept');

      // Stage 4 (Technical Design) should include technical deliverables
      const technicalStage = result.ribaStages.find(stage => stage.stage === 4);
      expect(technicalStage.deliverables).toContain('Technical design drawings');
      expect(technicalStage.deliverables).toContain('Structural calculations');
      expect(technicalStage.deliverables).toContain('Building regulations application');
    });
  });

  describe('NHBC Standards Compliance', () => {
    test('should validate NHBC standards for residential projects', async () => {
      const projectData = {
        projectType: 'extension',
        propertyType: 'residential',
        specifications: {
          foundations: 'concrete_strip',
          dpc: 'bitumen_felt',
          insulation: 'mineral_wool',
          ventilation: 'mechanical_extract'
        }
      };

      const result = await complianceService.validateNHBCStandards(projectData);

      expect(result).toHaveProperty('compliant');
      expect(result).toHaveProperty('standards');
      expect(result.standards).toContain('NHBC Chapter 4.1 - Foundations');
      expect(result.standards).toContain('NHBC Chapter 6.1 - Superstructure');
      expect(result.standards).toContain('NHBC Chapter 6.9 - Thermal insulation');
    });

    test('should enforce NHBC warranty requirements', async () => {
      const projectData = {
        projectType: 'new_build',
        propertyType: 'residential',
        buildValue: 250000
      };

      const result = await complianceService.validateNHBCWarranty(projectData);

      expect(result).toHaveProperty('warrantyRequired', true);
      expect(result).toHaveProperty('warrantyPeriod', 10); // 10 years
      expect(result).toHaveProperty('inspectionSchedule');
      expect(result.inspectionSchedule).toContain('Foundation inspection');
      expect(result.inspectionSchedule).toContain('Frame inspection');
      expect(result.inspectionSchedule).toContain('Pre-completion inspection');
    });
  });

  describe('UK Building Regulations Compliance', () => {
    test('should validate Part A (Structure) compliance', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        specifications: {
          structuralWork: true,
          loadBearingWalls: true,
          steelBeams: true,
          floorLoading: 1.5 // kN/m²
        }
      };

      const result = await complianceService.validateBuildingRegs(projectData);

      expect(result.partA).toHaveProperty('compliant');
      expect(result.partA.requirements).toContain('Structural calculations required');
      expect(result.partA.requirements).toContain('Building Control approval needed');
      expect(result.partA.requirements).toContain('Structural engineer certification');
    });

    test('should validate Part B (Fire Safety) compliance', async () => {
      const projectData = {
        projectType: 'loft_conversion',
        specifications: {
          newBedroom: true,
          escapeRoute: 'existing_stairs',
          fireDetection: 'smoke_alarms',
          fireResistance: 30 // minutes
        }
      };

      const result = await complianceService.validateBuildingRegs(projectData);

      expect(result.partB).toHaveProperty('compliant');
      expect(result.partB.requirements).toContain('Escape window required');
      expect(result.partB.requirements).toContain('Fire detection system');
      expect(result.partB.requirements).toContain('30-minute fire resistance');
    });

    test('should validate Part L (Conservation of Fuel and Power) compliance', async () => {
      const projectData = {
        projectType: 'extension',
        specifications: {
          wallInsulation: 'cavity_fill',
          roofInsulation: 'mineral_wool_270mm',
          windows: 'double_glazed',
          heating: 'gas_boiler_condensing'
        }
      };

      const result = await complianceService.validateBuildingRegs(projectData);

      expect(result.partL).toHaveProperty('compliant');
      expect(result.partL).toHaveProperty('uValues');
      expect(result.partL.uValues.walls).toBeLessThanOrEqual(0.28);
      expect(result.partL.uValues.roof).toBeLessThanOrEqual(0.16);
      expect(result.partL.uValues.windows).toBeLessThanOrEqual(1.6);
    });
  });

  describe('Planning Permission Compliance', () => {
    test('should identify when planning permission is required', async () => {
      const projectData = {
        projectType: 'extension',
        dimensions: {
          length: 8, // Exceeds permitted development
          width: 4,
          height: 4
        },
        location: {
          conservationArea: true,
          listedBuilding: false
        }
      };

      const result = await complianceService.checkPlanningRequirements(projectData);

      expect(result.planningRequired).toBe(true);
      expect(result.reasons).toContain('Exceeds permitted development limits');
      expect(result.reasons).toContain('Located in conservation area');
      expect(result).toHaveProperty('applicationProcess');
    });

    test('should validate permitted development rights', async () => {
      const projectData = {
        projectType: 'extension',
        dimensions: {
          length: 4, // Within permitted development
          width: 3,
          height: 3
        },
        location: {
          conservationArea: false,
          listedBuilding: false,
          articleFourDirection: false
        }
      };

      const result = await complianceService.checkPlanningRequirements(projectData);

      expect(result.planningRequired).toBe(false);
      expect(result.permittedDevelopment).toBe(true);
      expect(result).toHaveProperty('conditions');
      expect(result.conditions).toContain('Must not exceed 50% of original curtilage');
    });
  });

  describe('Health and Safety Compliance', () => {
    test('should validate CDM regulations compliance', async () => {
      const projectData = {
        projectType: 'extension',
        duration: 45, // days
        workers: 6,
        contractValue: 150000
      };

      const result = await complianceService.validateCDMCompliance(projectData);

      expect(result).toHaveProperty('cdmApplies', true);
      expect(result.requirements).toContain('Principal Designer appointment required');
      expect(result.requirements).toContain('Construction Phase Plan required');
      expect(result.requirements).toContain('Health and Safety File required');
    });

    test('should identify asbestos survey requirements', async () => {
      const projectData = {
        propertyAge: 1975, // Built before 1980
        projectType: 'loft_conversion',
        specifications: {
          structuralWork: true,
          ceilingRemoval: true
        }
      };

      const result = await complianceService.validateAsbestosRequirements(projectData);

      expect(result.surveyRequired).toBe(true);
      expect(result.surveyType).toBe('refurbishment_demolition');
      expect(result.requirements).toContain('Asbestos survey before work commences');
      expect(result.requirements).toContain('Licensed contractor if asbestos found');
    });
  });

  describe('Quality Assurance Standards', () => {
    test('should validate quality management system requirements', async () => {
      const projectData = {
        projectType: 'new_build',
        contractValue: 500000,
        duration: 120 // days
      };

      const result = await complianceService.validateQualityStandards(projectData);

      expect(result).toHaveProperty('iso9001Required', true);
      expect(result.requirements).toContain('Quality Management System');
      expect(result.requirements).toContain('Regular quality inspections');
      expect(result.requirements).toContain('Material testing and certification');
    });

    test('should validate environmental management requirements', async () => {
      const projectData = {
        projectType: 'extension',
        location: {
          environmentallySensitive: true,
          nearWaterCourse: true
        },
        materials: {
          sustainabilityRating: 'A+'
        }
      };

      const result = await complianceService.validateEnvironmentalStandards(projectData);

      expect(result).toHaveProperty('iso14001Recommended', true);
      expect(result.requirements).toContain('Environmental impact assessment');
      expect(result.requirements).toContain('Waste management plan');
      expect(result.requirements).toContain('Sustainable materials specification');
    });
  });
});