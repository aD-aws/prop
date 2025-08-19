import { ScopeOfWorkModel } from '../../models/ScopeOfWork';
import { 
  ScopeOfWork,
  SoWStatus,
  RibaStage,
  Specification,
  MaterialList,
  WorkPhase,
  Deliverable,
  AIGenerationMetadata,
  CostEstimate,
  ProjectType,
  ProjectRequirements,
  SoWValidationResult
} from '../../types';

describe('ScopeOfWorkModel', () => {
  const mockAIMetadata: AIGenerationMetadata = {
    model: 'claude-3-5-sonnet',
    version: '2.0',
    promptVersion: '2.1',
    generationTime: 30000,
    tokensUsed: 3500,
    confidence: 0.85,
    iterationsRequired: 1,
    validationPassed: true,
    knowledgeBaseSources: ['RICS', 'RIBA', 'NRM1', 'NRM2'],
    customizations: []
  };

  const mockCostEstimate: CostEstimate = {
    id: 'cost-estimate-id',
    projectId: 'project-id',
    methodology: 'NRM1',
    totalCost: 32000,
    currency: 'GBP',
    breakdown: [
      {
        category: 'building-works',
        description: 'Main construction works',
        quantity: 1,
        unit: 'item',
        unitRate: 25000,
        totalCost: 25000,
        source: {
          provider: 'test',
          type: 'database',
          reliability: 0.9,
          lastUpdated: new Date().toISOString(),
          coverage: 'UK'
        },
        confidence: 0.8,
        lastUpdated: new Date().toISOString()
      }
    ],
    confidence: {
      overall: 0.8,
      dataQuality: 0.8,
      marketStability: 0.8,
      projectComplexity: 0.7,
      timeHorizon: 0.9,
      explanation: 'Good confidence based on available data',
      factors: []
    },
    marketRates: {
      region: 'UK',
      lastUpdated: new Date().toISOString(),
      source: 'test-database',
      rates: [],
      labourRates: [],
      overheadFactors: []
    },
    lastUpdated: new Date().toISOString(),
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    version: 1,
    status: 'draft'
  };

  const mockRibaStages: RibaStage[] = [
    {
      stage: 0,
      title: 'Strategic Definition',
      description: 'Define project requirements and constraints',
      deliverables: ['Project brief', 'Feasibility study'],
      duration: 7,
      dependencies: [],
      workPackages: [],
      milestones: [],
      riskFactors: [],
      qualityStandards: []
    },
    {
      stage: 1,
      title: 'Preparation and Briefing',
      description: 'Develop detailed brief and initial design concepts',
      deliverables: ['Design brief', 'Site survey'],
      duration: 14,
      dependencies: ['stage-0'],
      workPackages: [],
      milestones: [],
      riskFactors: [],
      qualityStandards: []
    }
  ];

  const mockSpecifications: Specification[] = [
    {
      id: 'spec-1',
      category: 'structural',
      title: 'Structural Requirements',
      description: 'Structural alterations and reinforcement requirements',
      technicalRequirements: [
        {
          parameter: 'Floor loading',
          value: '1.5 kN/m²',
          unit: 'kN/m²',
          standard: 'BS EN 1991-1-1',
          critical: true
        }
      ],
      materials: [],
      workmanship: [],
      testing: [],
      compliance: [],
      aiGenerated: true,
      confidence: 0.9
    }
  ];

  const mockMaterials: MaterialList = {
    categories: [
      {
        category: 'Structural',
        items: [
          {
            id: 'item-1',
            name: 'Steel I-beam',
            specification: '203x133x25 UC',
            quantity: 2,
            unit: 'no',
            unitCost: 150,
            totalCost: 300,
            supplier: 'British Steel',
            alternatives: [],
            sustainability: {
              rating: 'B',
              criteria: ['Recyclable'],
              certifications: [],
              recyclability: 95,
              embodiedCarbon: 2.1
            },
            availability: {
              status: 'readily-available',
              leadTime: 5,
              supplier: 'British Steel',
              lastChecked: new Date().toISOString()
            },
            aiRecommended: true,
            confidence: 0.85
          }
        ],
        subtotal: 300
      }
    ],
    totalEstimatedCost: 25000,
    currency: 'GBP',
    lastUpdated: new Date().toISOString(),
    supplierRecommendations: [],
    sustainabilityScore: 75,
    aiGenerated: true
  };

  const mockWorkPhases: WorkPhase[] = [
    {
      id: 'phase-1',
      phase: 1,
      title: 'Preparation',
      description: 'Site preparation and access setup',
      duration: 3,
      dependencies: [],
      workPackages: [],
      resources: [
        {
          type: 'labour',
          resource: 'General labourer',
          quantity: 2,
          unit: 'person',
          duration: 3,
          cost: 600,
          critical: false,
          alternatives: []
        }
      ],
      risks: [],
      qualityGates: [],
      aiOptimized: true
    }
  ];

  const mockDeliverables: Deliverable[] = [
    {
      id: 'deliverable-1',
      title: 'Structural Calculations',
      description: 'Detailed structural calculations for beam sizing',
      type: 'calculation',
      ribaStage: 4,
      workPhase: 'design',
      format: ['PDF'],
      recipient: 'Building Control',
      dependencies: [],
      acceptanceCriteria: ['Approved by structural engineer'],
      aiGenerated: true
    }
  ];

  describe('create', () => {
    it('should create a new ScopeOfWork with all required fields', () => {
      const sowData = {
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      };

      const sow = ScopeOfWorkModel.create(sowData);

      expect(sow.id).toBeDefined();
      expect(sow.PK).toMatch(/^SOW#/);
      expect(sow.SK).toBe('METADATA');
      expect(sow.projectId).toBe('test-project-id');
      expect(sow.version).toBe(1);
      expect(sow.status).toBe('generated');
      expect(sow.ribaStages).toEqual(mockRibaStages);
      expect(sow.specifications).toEqual(mockSpecifications);
      expect(sow.materials).toEqual(mockMaterials);
      expect(sow.workPhases).toEqual(mockWorkPhases);
      expect(sow.deliverables).toEqual(mockDeliverables);
      expect(sow.aiGenerationMetadata).toEqual(mockAIMetadata);
      expect(sow.generatedAt).toBeDefined();
      expect(sow.GSI4PK).toBe('test-project-id');
      expect(sow.GSI4SK).toBe('generated#1');
      expect(sow.validationResults).toEqual([]);
      expect(sow.complianceChecks).toEqual([]);
    });
  });

  describe('createNewVersion', () => {
    it('should create a new version of an existing SoW', () => {
      const existingSoW = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const updates = {
        specifications: [...mockSpecifications, {
          id: 'spec-2',
          category: 'electrical' as any,
          title: 'Electrical Requirements',
          description: 'New electrical specifications',
          technicalRequirements: [],
          materials: [],
          workmanship: [],
          testing: [],
          compliance: [],
          aiGenerated: true,
          confidence: 0.8
        }]
      };

      const newVersion = ScopeOfWorkModel.createNewVersion(existingSoW, updates);

      expect(newVersion.id).not.toBe(existingSoW.id);
      expect(newVersion.version).toBe(2);
      expect(newVersion.status).toBe('generated');
      expect(newVersion.specifications).toHaveLength(2);
      expect(newVersion.GSI4SK).toBe('generated#2');
      expect(newVersion.approvedAt).toBeUndefined();
      expect(newVersion.validationResults).toEqual([]);
    });
  });

  describe('updateStatus', () => {
    it('should update SoW status', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const updatedSoW = ScopeOfWorkModel.updateStatus(sow, 'validated');

      expect(updatedSoW.status).toBe('validated');
      expect(updatedSoW.GSI4SK).toBe('validated#1');
      expect(updatedSoW.approvedAt).toBeUndefined();
    });

    it('should set approvedAt when status is approved', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const approvedSoW = ScopeOfWorkModel.updateStatus(sow, 'approved');

      expect(approvedSoW.status).toBe('approved');
      expect(approvedSoW.approvedAt).toBeDefined();
      expect(approvedSoW.GSI4SK).toBe('approved#1');
    });
  });

  describe('addValidationResult', () => {
    it('should add validation result to SoW', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const validationResult: SoWValidationResult = {
        validator: 'ai',
        validationType: 'completeness',
        passed: true,
        score: 85,
        issues: [],
        recommendations: ['Add more detail to specifications'],
        validatedAt: new Date().toISOString(),
        validatorDetails: 'AI validation service'
      };

      const updatedSoW = ScopeOfWorkModel.addValidationResult(sow, validationResult);

      expect(updatedSoW.validationResults).toHaveLength(1);
      expect(updatedSoW.validationResults[0]).toEqual(validationResult);
    });
  });

  describe('getValidationSummary', () => {
    it('should return validation summary for SoW with results', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const validationResult: SoWValidationResult = {
        validator: 'ai',
        validationType: 'completeness',
        passed: true,
        score: 85,
        issues: [
          {
            severity: 'warning',
            category: 'specifications',
            description: 'Missing detail in electrical specs',
            location: 'specifications[1]',
            suggestion: 'Add more technical requirements',
            impact: 'May cause confusion during construction',
            autoFixable: false
          },
          {
            severity: 'critical',
            category: 'structure',
            description: 'Missing structural calculations',
            location: 'deliverables',
            suggestion: 'Add structural calculation deliverable',
            impact: 'Cannot proceed without structural approval',
            autoFixable: false
          }
        ],
        recommendations: ['Add structural calculations', 'Review electrical specifications'],
        validatedAt: new Date().toISOString()
      };

      const sowWithValidation = ScopeOfWorkModel.addValidationResult(sow, validationResult);
      const summary = ScopeOfWorkModel.getValidationSummary(sowWithValidation);

      expect(summary.overallScore).toBe(85);
      expect(summary.passed).toBe(false); // Due to critical issue
      expect(summary.criticalIssues).toBe(1);
      expect(summary.warnings).toBe(1);
      expect(summary.recommendations).toContain('Add structural calculations');
      expect(summary.recommendations).toContain('Review electrical specifications');
    });

    it('should return default summary for SoW without validation results', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const summary = ScopeOfWorkModel.getValidationSummary(sow);

      expect(summary.overallScore).toBe(0);
      expect(summary.passed).toBe(false);
      expect(summary.criticalIssues).toBe(0);
      expect(summary.warnings).toBe(0);
      expect(summary.recommendations).toContain('No validation results available');
    });
  });

  describe('calculateTotalCost', () => {
    it('should calculate total cost from materials and work phases', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const totalCost = ScopeOfWorkModel.calculateTotalCost(sow);

      // Materials cost (25000) + Labour cost (600) = 25600
      expect(totalCost).toBe(25600);
    });
  });

  describe('getProjectTypeDefaults', () => {
    it('should return correct defaults for loft conversion', () => {
      const defaults = ScopeOfWorkModel.getProjectTypeDefaults('loft-conversion');

      expect(defaults.ribaStages).toEqual([0, 1, 2, 3, 4, 5]);
      expect(defaults.specifications).toContain('structural');
      expect(defaults.specifications).toContain('architectural');
      expect(defaults.workPhases).toContain('preparation');
      expect(defaults.workPhases).toContain('structural');
      expect(defaults.deliverables).toContain('structural-calculations');
    });

    it('should return correct defaults for bathroom renovation', () => {
      const defaults = ScopeOfWorkModel.getProjectTypeDefaults('bathroom-renovation');

      expect(defaults.ribaStages).toEqual([2, 3, 4, 5]);
      expect(defaults.specifications).toContain('plumbing');
      expect(defaults.specifications).toContain('electrical');
      expect(defaults.workPhases).toContain('strip-out');
      expect(defaults.workPhases).toContain('waterproofing');
    });
  });

  describe('validateSoW', () => {
    it('should return no errors for valid SoW', () => {
      const sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const errors = ScopeOfWorkModel.validateSoW(sow);

      expect(errors).toEqual([]);
    });

    it('should return errors for invalid SoW', () => {
      const invalidSoW = ScopeOfWorkModel.create({
        projectId: '', // Invalid
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: [], // Invalid - empty
        specifications: [], // Invalid - empty
        materials: { ...mockMaterials, categories: [] }, // Invalid - empty
        costEstimate: { ...mockCostEstimate, totalCost: 0 }, // Invalid - zero cost
        workPhases: [], // Invalid - empty
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const errors = ScopeOfWorkModel.validateSoW(invalidSoW);

      expect(errors).toContain('Project ID is required');
      expect(errors).toContain('At least one RIBA stage is required');
      expect(errors).toContain('At least one specification is required');
      expect(errors).toContain('At least one work phase is required');
      expect(errors).toContain('Materials list must have at least one category');
      expect(errors).toContain('Valid cost estimate is required');
    });

    it('should validate RIBA stage sequence', () => {
      const sowWithGappedStages = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: [
          { ...mockRibaStages[0], stage: 0 },
          { ...mockRibaStages[1], stage: 3 } // Gap between 0 and 3
        ],
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const errors = ScopeOfWorkModel.validateSoW(sowWithGappedStages);

      expect(errors).toContain('RIBA stages should be sequential. Gap found between stage 0 and 3');
    });

    it('should validate work phases have resources', () => {
      const sowWithEmptyPhase = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: [
          {
            ...mockWorkPhases[0],
            resources: [] // Empty resources
          }
        ],
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });

      const errors = ScopeOfWorkModel.validateSoW(sowWithEmptyPhase);

      expect(errors).toContain('Work phase 1 (Preparation) must have at least one resource requirement');
    });
  });

  describe('utility methods', () => {
    let sow: ScopeOfWork;

    beforeEach(() => {
      sow = ScopeOfWorkModel.create({
        projectId: 'test-project-id',
        projectType: 'loft-conversion' as ProjectType,
        requirements: {} as ProjectRequirements,
        ribaStages: mockRibaStages,
        specifications: mockSpecifications,
        materials: mockMaterials,
        costEstimate: mockCostEstimate,
        workPhases: mockWorkPhases,
        deliverables: mockDeliverables,
        aiGenerationMetadata: mockAIMetadata
      });
    });

    describe('sanitizeForResponse', () => {
      it('should remove GSI fields from response', () => {
        const sanitized = ScopeOfWorkModel.sanitizeForResponse(sow);

        expect('GSI4PK' in sanitized).toBe(false);
        expect('GSI4SK' in sanitized).toBe(false);
        expect(sanitized.id).toBeDefined();
        expect(sanitized.projectId).toBeDefined();
      });
    });

    describe('getEstimatedDuration', () => {
      it('should return maximum duration from work phases', () => {
        const duration = ScopeOfWorkModel.getEstimatedDuration(sow);

        expect(duration).toBe(3); // From mockWorkPhases[0].duration
      });
    });

    describe('getCriticalPath', () => {
      it('should return critical path based on dependencies', () => {
        const criticalPath = ScopeOfWorkModel.getCriticalPath(sow);

        expect(criticalPath).toContain('phase-1'); // First phase with no dependencies
      });
    });

    describe('getResourceSummary', () => {
      it('should return resource summary', () => {
        const summary = ScopeOfWorkModel.getResourceSummary(sow);

        expect(summary.totalLabourDays).toBe(6); // 2 people * 3 days
        expect(summary.totalEquipmentDays).toBe(0);
        expect(summary.totalMaterialsCost).toBe(25000);
        expect(summary.criticalResources).toEqual([]); // No critical resources in mock data
      });
    });
  });
});