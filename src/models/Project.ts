import { 
  Project, 
  ProjectType, 
  ProjectStatus, 
  ProjectRequirements, 
  Address, 
  CouncilData,
  Document,
  Dimensions,
  MaterialPreferences,
  Timeline,
  BudgetRange
} from '../types';
import { v4 as uuidv4 } from 'uuid';

export class ProjectModel {
  static create(projectData: {
    ownerId: string;
    propertyAddress: Address;
    projectType: ProjectType;
    requirements?: Partial<ProjectRequirements>;
  }): Project {
    const projectId = uuidv4();
    const now = new Date().toISOString();
    const status: ProjectStatus = 'draft';

    // Default requirements structure
    const defaultRequirements: ProjectRequirements = {
      description: '',
      dimensions: {
        unit: 'meters' as const
      },
      materials: {
        quality: 'standard' as const,
        preferences: [],
        restrictions: []
      },
      timeline: {
        flexibility: 'flexible' as const
      },
      budget: {
        min: 0,
        max: 0,
        currency: 'GBP' as const
      },
      specialRequirements: []
    };

    return {
      PK: `PROJECT#${projectId}`,
      SK: 'METADATA',
      id: projectId,
      ownerId: projectData.ownerId,
      propertyAddress: projectData.propertyAddress,
      projectType: projectData.projectType,
      status,
      requirements: {
        ...defaultRequirements,
        ...projectData.requirements
      },
      documents: [],
      councilData: {
        conservationArea: false,
        listedBuilding: false,
        planningRestrictions: [],
        localAuthority: '',
        contactDetails: {
          name: ''
        },
        lastChecked: now
      },
      createdAt: now,
      updatedAt: now,
      GSI2PK: status,
      GSI2SK: now
    };
  }

  static update(existingProject: Project, updates: Partial<Project>): Project {
    const updatedProject = {
      ...existingProject,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Update GSI2PK if status changed
    if (updates.status && updates.status !== existingProject.status) {
      updatedProject.GSI2PK = updates.status;
    }

    return updatedProject;
  }

  static validateRequirements(requirements: ProjectRequirements, projectType: ProjectType): string[] {
    const errors: string[] = [];

    // Basic validation
    if (!requirements.description?.trim()) {
      errors.push('Project description is required');
    }

    // Budget validation
    if (requirements.budget.min < 0) {
      errors.push('Minimum budget cannot be negative');
    }

    if (requirements.budget.max > 0 && requirements.budget.max < requirements.budget.min) {
      errors.push('Maximum budget must be greater than minimum budget');
    }

    // Timeline validation
    if (requirements.timeline.startDate && requirements.timeline.endDate) {
      const startDate = new Date(requirements.timeline.startDate);
      const endDate = new Date(requirements.timeline.endDate);
      
      if (startDate >= endDate) {
        errors.push('End date must be after start date');
      }

      if (startDate < new Date()) {
        errors.push('Start date cannot be in the past');
      }
    }

    // Dimensions validation based on project type
    if (this.requiresDimensions(projectType)) {
      // First validate individual dimension values
      if (requirements.dimensions.length !== undefined && requirements.dimensions.length <= 0) {
        errors.push('Length must be greater than 0');
      }

      if (requirements.dimensions.width !== undefined && requirements.dimensions.width <= 0) {
        errors.push('Width must be greater than 0');
      }

      if (requirements.dimensions.height !== undefined && requirements.dimensions.height <= 0) {
        errors.push('Height must be greater than 0');
      }

      if (requirements.dimensions.area !== undefined && requirements.dimensions.area <= 0) {
        errors.push('Area must be greater than 0');
      }

      // Then check if dimensions are provided at all (only if no individual validation errors)
      if (!requirements.dimensions.area && 
          (!requirements.dimensions.length || !requirements.dimensions.width)) {
        errors.push('Dimensions are required for this project type');
      }
    }

    return errors;
  }

  static validateAddress(address: Address): string[] {
    const errors: string[] = [];

    if (!address.line1?.trim()) {
      errors.push('Address line 1 is required');
    }

    if (!address.city?.trim()) {
      errors.push('City is required');
    }

    if (!address.postcode?.trim()) {
      errors.push('Postcode is required');
    } else if (!this.isValidPostcode(address.postcode)) {
      errors.push('Invalid UK postcode format');
    }

    if (!address.country?.trim()) {
      errors.push('Country is required');
    }

    return errors;
  }

  private static isValidPostcode(postcode: string): boolean {
    // UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i;
    return postcodeRegex.test(postcode.replace(/\s/g, ''));
  }

  private static requiresDimensions(projectType: ProjectType): boolean {
    const dimensionRequiredTypes: ProjectType[] = [
      'loft-conversion',
      'rear-extension',
      'side-extension',
      'conservatory',
      'garage-conversion',
      'basement-conversion'
    ];
    return dimensionRequiredTypes.includes(projectType);
  }

  static getProjectTypeInfo(projectType: ProjectType): {
    title: string;
    description: string;
    typicalCost: string;
    timeframe: string;
    planningRequired: boolean;
    buildingRegsRequired: boolean;
    keyConsiderations: string[];
  } {
    const projectTypeInfo = {
      'loft-conversion': {
        title: 'Loft Conversion',
        description: 'Convert your unused loft space into a functional room such as a bedroom, office, or bathroom. This can add significant value to your property.',
        typicalCost: '£15,000 - £60,000',
        timeframe: '4-8 weeks',
        planningRequired: false,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Head height must be at least 2.2m',
          'Structural calculations may be required',
          'Fire safety regulations must be met',
          'Insulation and ventilation requirements',
          'Staircase access considerations'
        ]
      },
      'rear-extension': {
        title: 'Rear Extension',
        description: 'Extend your home backwards to create additional living space. Popular for kitchen-diners and family rooms.',
        typicalCost: '£15,000 - £50,000',
        timeframe: '6-12 weeks',
        planningRequired: true,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Permitted development rights may apply',
          'Party wall agreements with neighbors',
          'Foundation requirements',
          'Roof design and drainage',
          'Integration with existing structure'
        ]
      },
      'side-extension': {
        title: 'Side Extension',
        description: 'Extend your home to the side, often used to create larger kitchens or additional reception rooms.',
        typicalCost: '£12,000 - £40,000',
        timeframe: '6-10 weeks',
        planningRequired: true,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Boundary distances and neighbor rights',
          'Matching materials and design',
          'Structural integration',
          'Utilities relocation',
          'Garden space impact'
        ]
      },
      'bathroom-renovation': {
        title: 'Bathroom Renovation',
        description: 'Complete renovation of your bathroom including new fixtures, tiling, and potentially layout changes.',
        typicalCost: '£5,000 - £25,000',
        timeframe: '2-4 weeks',
        planningRequired: false,
        buildingRegsRequired: false,
        keyConsiderations: [
          'Plumbing and electrical work',
          'Waterproofing requirements',
          'Ventilation needs',
          'Accessibility considerations',
          'Fixture quality and durability'
        ]
      },
      'kitchen-renovation': {
        title: 'Kitchen Renovation',
        description: 'Transform your kitchen with new units, appliances, and potentially structural changes for open-plan living.',
        typicalCost: '£8,000 - £35,000',
        timeframe: '3-6 weeks',
        planningRequired: false,
        buildingRegsRequired: false,
        keyConsiderations: [
          'Electrical requirements for appliances',
          'Plumbing for sinks and dishwashers',
          'Ventilation and extraction',
          'Work triangle efficiency',
          'Storage optimization'
        ]
      },
      'conservatory': {
        title: 'Conservatory',
        description: 'Add a glass extension to your home, perfect for enjoying garden views while staying protected from the weather.',
        typicalCost: '£8,000 - £30,000',
        timeframe: '2-4 weeks',
        planningRequired: false,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Foundation requirements',
          'Glazing specifications',
          'Heating and cooling',
          'Drainage and guttering',
          'Integration with existing structure'
        ]
      },
      'garage-conversion': {
        title: 'Garage Conversion',
        description: 'Convert your garage into usable living space such as a home office, gym, or additional bedroom.',
        typicalCost: '£6,000 - £20,000',
        timeframe: '3-5 weeks',
        planningRequired: false,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Insulation and damp proofing',
          'Floor level adjustments',
          'Window and door installation',
          'Heating and electrical systems',
          'Alternative parking arrangements'
        ]
      },
      'basement-conversion': {
        title: 'Basement Conversion',
        description: 'Convert your basement or cellar into functional living space, adding significant square footage to your home.',
        typicalCost: '£20,000 - £70,000',
        timeframe: '8-16 weeks',
        planningRequired: true,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Waterproofing and damp treatment',
          'Structural assessments',
          'Ceiling height requirements',
          'Emergency egress windows',
          'Ventilation and lighting'
        ]
      },
      'roof-replacement': {
        title: 'Roof Replacement',
        description: 'Complete replacement of your roof covering, structure, or both to ensure weather protection and energy efficiency.',
        typicalCost: '£8,000 - £25,000',
        timeframe: '1-3 weeks',
        planningRequired: false,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Material selection and durability',
          'Insulation improvements',
          'Structural integrity assessment',
          'Guttering and drainage',
          'Weather protection during work'
        ]
      },
      'other': {
        title: 'Other Project',
        description: 'Custom home improvement project not covered by standard categories.',
        typicalCost: 'Varies',
        timeframe: 'Varies',
        planningRequired: true,
        buildingRegsRequired: true,
        keyConsiderations: [
          'Detailed project specification required',
          'Professional consultation recommended',
          'Regulatory compliance assessment',
          'Structural impact evaluation',
          'Neighbor consultation may be needed'
        ]
      }
    };

    return projectTypeInfo[projectType];
  }

  static getNextSteps(status: ProjectStatus): {
    currentStep: string;
    nextStep: string;
    description: string;
    actionRequired: string;
  } {
    const stepInfo = {
      'draft': {
        currentStep: 'Project Setup',
        nextStep: 'Requirements Gathering',
        description: 'Your project has been created and basic information captured.',
        actionRequired: 'Complete your project requirements including dimensions, materials, and timeline.'
      },
      'requirements-gathering': {
        currentStep: 'Requirements Gathering',
        nextStep: 'Council Check',
        description: 'Collecting detailed project requirements and specifications.',
        actionRequired: 'Provide complete project details, upload any existing plans or documents.'
      },
      'council-check': {
        currentStep: 'Council Data Check',
        nextStep: 'SoW Generation',
        description: 'Checking planning restrictions and council requirements for your property.',
        actionRequired: 'Review council data and confirm any additional requirements.'
      },
      'sow-generation': {
        currentStep: 'Scope of Work Generation',
        nextStep: 'Quote Collection',
        description: 'Generating detailed Scope of Work based on your requirements.',
        actionRequired: 'Review and approve the generated Scope of Work.'
      },
      'quote-collection': {
        currentStep: 'Quote Collection',
        nextStep: 'Quote Review',
        description: 'Sharing your SoW with selected builders to collect quotes.',
        actionRequired: 'Wait for builders to submit their quotes.'
      },
      'quote-review': {
        currentStep: 'Quote Review',
        nextStep: 'Contract Generation',
        description: 'Reviewing and comparing quotes from builders.',
        actionRequired: 'Select your preferred builder and quote.'
      },
      'contract-generation': {
        currentStep: 'Contract Generation',
        nextStep: 'Project Active',
        description: 'Generating contract based on selected quote.',
        actionRequired: 'Review and sign the contract.'
      },
      'active': {
        currentStep: 'Project Active',
        nextStep: 'Project Completion',
        description: 'Your project is underway with the selected builder.',
        actionRequired: 'Monitor progress and communicate with your builder.'
      },
      'completed': {
        currentStep: 'Project Completed',
        nextStep: 'None',
        description: 'Your project has been successfully completed.',
        actionRequired: 'Leave feedback and close the project.'
      },
      'cancelled': {
        currentStep: 'Project Cancelled',
        nextStep: 'None',
        description: 'This project has been cancelled.',
        actionRequired: 'No further action required.'
      }
    };

    return stepInfo[status];
  }

  static sanitizeForResponse(project: Project): Omit<Project, 'GSI2PK' | 'GSI2SK'> {
    const { GSI2PK, GSI2SK, ...sanitizedProject } = project;
    return sanitizedProject;
  }

  static addDocument(project: Project, document: Document): Project {
    return {
      ...project,
      documents: [...project.documents, document],
      updatedAt: new Date().toISOString()
    };
  }

  static updateCouncilData(project: Project, councilData: CouncilData): Project {
    return {
      ...project,
      councilData,
      updatedAt: new Date().toISOString()
    };
  }

  static calculateCompletionPercentage(project: Project): number {
    const statusWeights = {
      'draft': 10,
      'requirements-gathering': 25,
      'council-check': 40,
      'sow-generation': 55,
      'quote-collection': 70,
      'quote-review': 85,
      'contract-generation': 95,
      'active': 100,
      'completed': 100,
      'cancelled': 0
    };

    return statusWeights[project.status] || 0;
  }
}