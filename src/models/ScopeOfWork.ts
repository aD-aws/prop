import { 
  ScopeOfWork, 
  SoWStatus,
  RibaStage,
  Specification,
  MaterialList,
  WorkPhase,
  Deliverable,
  AIGenerationMetadata,
  SoWValidationResult,
  ProjectType,
  ProjectRequirements,
  CostEstimate
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ScopeOfWorkModel {
  static create(sowData: {
    projectId: string;
    projectType: ProjectType;
    requirements: ProjectRequirements;
    ribaStages: RibaStage[];
    specifications: Specification[];
    materials: MaterialList;
    costEstimate: CostEstimate;
    workPhases: WorkPhase[];
    deliverables: Deliverable[];
    aiGenerationMetadata: AIGenerationMetadata;
  }): ScopeOfWork {
    const sowId = uuidv4();
    const now = new Date().toISOString();

    return {
      PK: `SOW#${sowId}`,
      SK: 'METADATA',
      id: sowId,
      projectId: sowData.projectId,
      version: 1,
      ribaStages: sowData.ribaStages,
      specifications: sowData.specifications,
      materials: sowData.materials,
      costEstimate: sowData.costEstimate,
      complianceChecks: [], // Will be populated by compliance service
      workPhases: sowData.workPhases,
      deliverables: sowData.deliverables,
      generatedAt: now,
      status: 'generated' as SoWStatus,
      aiGenerationMetadata: sowData.aiGenerationMetadata,
      validationResults: [],
      GSI4PK: sowData.projectId,
      GSI4SK: `generated#1`
    };
  }

  static createNewVersion(existingSoW: ScopeOfWork, updates: Partial<ScopeOfWork>): ScopeOfWork {
    const newVersion = existingSoW.version + 1;
    const now = new Date().toISOString();
    const sowId = uuidv4();

    return {
      ...existingSoW,
      ...updates,
      PK: `SOW#${sowId}`,
      id: sowId,
      version: newVersion,
      generatedAt: now,
      approvedAt: undefined,
      status: 'generated' as SoWStatus,
      validationResults: [],
      GSI4SK: `generated#${newVersion}`
    };
  }

  static updateStatus(sow: ScopeOfWork, status: SoWStatus): ScopeOfWork {
    const updates: Partial<ScopeOfWork> = {
      status,
      GSI4SK: `${status}#${sow.version}`
    };

    if (status === 'approved') {
      updates.approvedAt = new Date().toISOString();
    }

    return {
      ...sow,
      ...updates
    };
  }

  static addValidationResult(sow: ScopeOfWork, validationResult: SoWValidationResult): ScopeOfWork {
    return {
      ...sow,
      validationResults: [...sow.validationResults, validationResult]
    };
  }

  static getValidationSummary(sow: ScopeOfWork): {
    overallScore: number;
    passed: boolean;
    criticalIssues: number;
    warnings: number;
    recommendations: string[];
  } {
    if (sow.validationResults.length === 0) {
      return {
        overallScore: 0,
        passed: false,
        criticalIssues: 0,
        warnings: 0,
        recommendations: ['No validation results available']
      };
    }

    const scores = sow.validationResults.map(r => r.score);
    const overallScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    const allIssues = sow.validationResults.flatMap(r => r.issues);
    const criticalIssues = allIssues.filter(i => i.severity === 'critical' || i.severity === 'error').length;
    const warnings = allIssues.filter(i => i.severity === 'warning').length;
    
    const allRecommendations = sow.validationResults.flatMap(r => r.recommendations);
    const uniqueRecommendations = [...new Set(allRecommendations)];

    return {
      overallScore: Math.round(overallScore),
      passed: overallScore >= 80 && criticalIssues === 0,
      criticalIssues,
      warnings,
      recommendations: uniqueRecommendations
    };
  }

  static calculateTotalCost(sow: ScopeOfWork): number {
    // Sum up costs from materials and work phases
    const materialsCost = sow.materials.totalEstimatedCost;
    const labourCost = sow.workPhases.reduce((total, phase) => {
      return total + phase.resources
        .filter(r => r.type === 'labour')
        .reduce((phaseTotal, resource) => phaseTotal + resource.cost, 0);
    }, 0);
    
    const equipmentCost = sow.workPhases.reduce((total, phase) => {
      return total + phase.resources
        .filter(r => r.type === 'equipment')
        .reduce((phaseTotal, resource) => phaseTotal + resource.cost, 0);
    }, 0);

    return materialsCost + labourCost + equipmentCost;
  }

  static getProjectTypeDefaults(projectType: ProjectType): {
    ribaStages: number[];
    specifications: string[];
    workPhases: string[];
    deliverables: string[];
  } {
    const defaults = {
      'loft-conversion': {
        ribaStages: [0, 1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'finishes'],
        workPhases: ['preparation', 'structural', 'first-fix', 'insulation', 'second-fix', 'finishes'],
        deliverables: ['structural-calculations', 'building-regs-drawings', 'fire-safety-strategy']
      },
      'rear-extension': {
        ribaStages: [0, 1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'external-works', 'finishes'],
        workPhases: ['excavation', 'foundations', 'structural', 'roofing', 'first-fix', 'second-fix', 'finishes', 'external-works'],
        deliverables: ['planning-drawings', 'structural-calculations', 'building-regs-drawings']
      },
      'side-extension': {
        ribaStages: [0, 1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'external-works', 'finishes'],
        workPhases: ['excavation', 'foundations', 'structural', 'roofing', 'first-fix', 'second-fix', 'finishes', 'external-works'],
        deliverables: ['planning-drawings', 'structural-calculations', 'building-regs-drawings']
      },
      'bathroom-renovation': {
        ribaStages: [2, 3, 4, 5],
        specifications: ['mechanical', 'electrical', 'plumbing', 'finishes'],
        workPhases: ['strip-out', 'first-fix', 'waterproofing', 'tiling', 'second-fix', 'finishes'],
        deliverables: ['design-drawings', 'specification-schedule']
      },
      'kitchen-renovation': {
        ribaStages: [2, 3, 4, 5],
        specifications: ['mechanical', 'electrical', 'plumbing', 'finishes'],
        workPhases: ['strip-out', 'first-fix', 'units-installation', 'worktops', 'second-fix', 'finishes'],
        deliverables: ['design-drawings', 'specification-schedule', 'appliance-schedule']
      },
      'conservatory': {
        ribaStages: [0, 1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'external-works'],
        workPhases: ['excavation', 'foundations', 'frame-erection', 'glazing', 'roofing', 'finishes'],
        deliverables: ['structural-calculations', 'building-regs-drawings']
      },
      'garage-conversion': {
        ribaStages: [1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'finishes'],
        workPhases: ['preparation', 'insulation', 'first-fix', 'second-fix', 'finishes'],
        deliverables: ['building-regs-drawings', 'insulation-strategy']
      },
      'basement-conversion': {
        ribaStages: [0, 1, 2, 3, 4, 5, 6],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'finishes', 'health-safety'],
        workPhases: ['excavation', 'waterproofing', 'structural', 'first-fix', 'second-fix', 'finishes'],
        deliverables: ['structural-calculations', 'building-regs-drawings', 'waterproofing-strategy', 'ventilation-strategy']
      },
      'roof-replacement': {
        ribaStages: [1, 2, 3, 4, 5],
        specifications: ['structural', 'external-works'],
        workPhases: ['strip-out', 'structural-repairs', 'insulation', 'covering', 'guttering'],
        deliverables: ['structural-assessment', 'building-regs-drawings']
      },
      'other': {
        ribaStages: [0, 1, 2, 3, 4, 5],
        specifications: ['structural', 'architectural', 'mechanical', 'electrical', 'finishes'],
        workPhases: ['preparation', 'construction', 'finishes'],
        deliverables: ['design-drawings', 'specification-schedule']
      }
    };

    return defaults[projectType];
  }

  static validateSoW(sow: ScopeOfWork): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!sow.projectId) {
      errors.push('Project ID is required');
    }

    if (sow.ribaStages.length === 0) {
      errors.push('At least one RIBA stage is required');
    }

    if (sow.specifications.length === 0) {
      errors.push('At least one specification is required');
    }

    if (sow.workPhases.length === 0) {
      errors.push('At least one work phase is required');
    }

    // Validate RIBA stages sequence
    const stageNumbers = sow.ribaStages.map(s => s.stage).sort((a, b) => a - b);
    for (let i = 1; i < stageNumbers.length; i++) {
      if (stageNumbers[i] - stageNumbers[i-1] > 1) {
        errors.push(`RIBA stages should be sequential. Gap found between stage ${stageNumbers[i-1]} and ${stageNumbers[i]}`);
      }
    }

    // Validate work phases have resources
    sow.workPhases.forEach((phase, index) => {
      if (phase.resources.length === 0) {
        errors.push(`Work phase ${index + 1} (${phase.title}) must have at least one resource requirement`);
      }
    });

    // Validate materials list
    if (sow.materials.categories.length === 0) {
      errors.push('Materials list must have at least one category');
    }

    // Validate cost estimate exists
    if (!sow.costEstimate || sow.costEstimate.totalCost <= 0) {
      errors.push('Valid cost estimate is required');
    }

    return errors;
  }

  static sanitizeForResponse(sow: ScopeOfWork): Omit<ScopeOfWork, 'GSI4PK' | 'GSI4SK'> {
    const { GSI4PK, GSI4SK, ...sanitizedSoW } = sow;
    return sanitizedSoW;
  }

  static getEstimatedDuration(sow: ScopeOfWork): number {
    // Calculate total duration from work phases
    return sow.workPhases.reduce((total, phase) => {
      return Math.max(total, phase.duration);
    }, 0);
  }

  static getCriticalPath(sow: ScopeOfWork): string[] {
    // Simple critical path calculation based on dependencies
    const phases = sow.workPhases.sort((a, b) => a.phase - b.phase);
    const criticalPath: string[] = [];
    
    phases.forEach(phase => {
      if (phase.dependencies.length === 0 || 
          phase.dependencies.some(dep => criticalPath.includes(dep))) {
        criticalPath.push(phase.id);
      }
    });

    return criticalPath;
  }

  static getResourceSummary(sow: ScopeOfWork): {
    totalLabourDays: number;
    totalEquipmentDays: number;
    totalMaterialsCost: number;
    criticalResources: string[];
  } {
    let totalLabourDays = 0;
    let totalEquipmentDays = 0;
    const criticalResources: string[] = [];

    sow.workPhases.forEach(phase => {
      phase.resources.forEach(resource => {
        if (resource.type === 'labour') {
          totalLabourDays += (resource.duration || 1) * resource.quantity;
        } else if (resource.type === 'equipment') {
          totalEquipmentDays += (resource.duration || 1) * resource.quantity;
        }

        if (resource.critical) {
          criticalResources.push(`${phase.title}: ${resource.resource}`);
        }
      });
    });

    return {
      totalLabourDays,
      totalEquipmentDays,
      totalMaterialsCost: sow.materials.totalEstimatedCost,
      criticalResources
    };
  }
}