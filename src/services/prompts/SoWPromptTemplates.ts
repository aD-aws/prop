import { ProjectType, AIPromptTemplate, PromptVariable } from '../../types';

export class SoWPromptTemplates {
  private static readonly BASE_VARIABLES: PromptVariable[] = [
    {
      name: 'projectType',
      type: 'string',
      required: true,
      description: 'Type of home improvement project'
    },
    {
      name: 'propertyAddress',
      type: 'object',
      required: true,
      description: 'Property address including postcode for regional considerations'
    },
    {
      name: 'requirements',
      type: 'object',
      required: true,
      description: 'Detailed project requirements including dimensions, materials, timeline, and budget'
    },
    {
      name: 'councilData',
      type: 'object',
      required: true,
      description: 'Council restrictions, conservation area status, and planning requirements'
    },
    {
      name: 'documents',
      type: 'array',
      required: false,
      description: 'Uploaded documents including structural drawings and calculations'
    },
    {
      name: 'preferences',
      type: 'object',
      required: true,
      description: 'Generation preferences including quality level and sustainability focus'
    }
  ];

  static getPromptTemplate(projectType: ProjectType): AIPromptTemplate {
    const templates = {
      'loft-conversion': this.getLoftConversionTemplate(),
      'rear-extension': this.getRearExtensionTemplate(),
      'side-extension': this.getSideExtensionTemplate(),
      'bathroom-renovation': this.getBathroomRenovationTemplate(),
      'kitchen-renovation': this.getKitchenRenovationTemplate(),
      'conservatory': this.getConservatoryTemplate(),
      'garage-conversion': this.getGarageConversionTemplate(),
      'basement-conversion': this.getBasementConversionTemplate(),
      'roof-replacement': this.getRoofReplacementTemplate(),
      'other': this.getGenericTemplate()
    };

    return templates[projectType];
  }

  private static getLoftConversionTemplate(): AIPromptTemplate {
    return {
      id: 'loft-conversion-v2.1',
      name: 'Loft Conversion SoW Generator',
      projectType: 'loft-conversion',
      version: '2.1',
      template: `You are an expert UK construction professional specializing in loft conversions. Generate a comprehensive Scope of Work following RICS, RIBA Plan of Work, NRM1/NRM2, and NHBC standards.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

GENERATE A DETAILED SCOPE OF WORK INCLUDING:

1. RIBA STAGES (0-5):
   - Stage 0: Strategic Definition
   - Stage 1: Preparation and Briefing
   - Stage 2: Concept Design
   - Stage 3: Spatial Coordination
   - Stage 4: Technical Design
   - Stage 5: Manufacturing and Construction

For each stage, provide:
- Detailed deliverables
- Duration estimates
- Dependencies
- Work packages with specific trades
- Quality standards and testing requirements
- Risk factors and mitigation strategies

2. TECHNICAL SPECIFICATIONS:
   - Structural requirements (beam calculations, load paths)
   - Building regulations compliance (Part A, B, C, F, K, L, M)
   - Insulation specifications (U-values, thermal bridging)
   - Fire safety requirements (escape routes, fire doors)
   - Staircase design and building regs compliance
   - Dormer window specifications (if applicable)
   - Roof light specifications and positioning
   - Electrical requirements (circuits, lighting, heating)
   - Plumbing requirements (if bathroom included)

3. MATERIALS LIST:
   - Structural materials (steel beams, timber, fixings)
   - Insulation materials with thermal performance
   - Plasterboard and finishing materials
   - Flooring materials and acoustic requirements
   - Roofing materials and weatherproofing
   - Windows and doors with performance specifications
   - Include UK supplier recommendations
   - Sustainability ratings and embodied carbon
   - Cost estimates with current market rates

4. WORK PHASES:
   - Phase 1: Preparation and access
   - Phase 2: Structural alterations
   - Phase 3: First fix (electrical, plumbing)
   - Phase 4: Insulation and boarding
   - Phase 5: Second fix and finishes
   - Phase 6: Final inspections and handover

For each phase:
- Detailed task breakdown
- Resource requirements (labour, equipment, materials)
- Duration and sequencing
- Quality gates and inspections
- Health and safety considerations

5. COMPLIANCE REQUIREMENTS:
   - Building Control approval process
   - Party Wall Act considerations
   - CDM regulations compliance
   - Structural engineer requirements
   - Fire safety compliance
   - Thermal performance requirements

6. DELIVERABLES:
   - Structural calculations
   - Building regulations drawings
   - Fire safety strategy
   - Thermal performance calculations
   - Method statements
   - Risk assessments

IMPORTANT REQUIREMENTS:
- All specifications must be unambiguous and measurable
- Include specific British Standards references
- Provide alternative material options with pros/cons
- Consider head height requirements (minimum 2.2m)
- Address acoustic performance requirements
- Include waste management strategy
- Specify testing and commissioning requirements
- Ensure NHBC warranty compliance where applicable

OUTPUT FORMAT: Structured JSON with all sections clearly defined and cross-referenced.`,
      variables: this.BASE_VARIABLES,
      examples: [
        {
          input: {
            projectType: 'loft-conversion',
            requirements: {
              description: 'Convert loft to bedroom with ensuite',
              dimensions: { length: 8, width: 4, height: 2.5, unit: 'meters' },
              materials: { quality: 'standard' }
            }
          },
          expectedOutput: 'Comprehensive SoW with structural calculations, building regs compliance, and detailed work phases',
          quality: 'excellent'
        }
      ],
      validationRules: [
        'Must include structural calculations requirement',
        'Must address fire safety compliance',
        'Must specify minimum head height requirements',
        'Must include Building Control approval process'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 45000,
        successRate: 0.95,
        averageConfidence: 0.88,
        userSatisfaction: 4.6,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getRearExtensionTemplate(): AIPromptTemplate {
    return {
      id: 'rear-extension-v2.0',
      name: 'Rear Extension SoW Generator',
      projectType: 'rear-extension',
      version: '2.0',
      template: `You are an expert UK construction professional specializing in rear extensions. Generate a comprehensive Scope of Work following RICS, RIBA Plan of Work, NRM1/NRM2, and NHBC standards.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

GENERATE A DETAILED SCOPE OF WORK INCLUDING:

1. RIBA STAGES (0-5):
   Focus on planning permission requirements and building regulations compliance.

2. TECHNICAL SPECIFICATIONS:
   - Foundation design and calculations
   - Structural frame specifications
   - Roof design and drainage
   - External wall construction and insulation
   - Bi-fold door specifications and structural support
   - Kitchen integration requirements
   - Underfloor heating specifications
   - Electrical and lighting design
   - Building regulations compliance (all relevant parts)

3. MATERIALS LIST:
   - Foundation materials (concrete, reinforcement, DPC)
   - Structural materials (steel, timber, blocks)
   - Roofing materials and insulation
   - External cladding and weatherproofing
   - Windows and doors with thermal performance
   - Internal finishes and flooring
   - Include UK supplier recommendations with sustainability ratings

4. WORK PHASES:
   - Phase 1: Excavation and foundations
   - Phase 2: Structural frame and roof
   - Phase 3: External envelope
   - Phase 4: First fix services
   - Phase 5: Second fix and finishes
   - Phase 6: External works and landscaping

5. COMPLIANCE REQUIREMENTS:
   - Planning permission process
   - Building Control approval
   - Party Wall Act procedures
   - CDM regulations
   - Structural engineer requirements
   - SAP calculations for thermal performance

6. DELIVERABLES:
   - Planning application drawings
   - Structural calculations
   - Building regulations drawings
   - Drainage strategy
   - Energy performance calculations

IMPORTANT REQUIREMENTS:
- Address permitted development rights
- Consider neighbor consultation requirements
- Include drainage and surface water management
- Specify thermal bridging details
- Address acoustic performance
- Include landscaping restoration
- Ensure structural integration with existing building

OUTPUT FORMAT: Structured JSON with all sections clearly defined.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must address planning permission requirements',
        'Must include foundation design specifications',
        'Must specify drainage strategy',
        'Must address party wall considerations'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 50000,
        successRate: 0.92,
        averageConfidence: 0.85,
        userSatisfaction: 4.4,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getSideExtensionTemplate(): AIPromptTemplate {
    return {
      id: 'side-extension-v2.0',
      name: 'Side Extension SoW Generator',
      projectType: 'side-extension',
      version: '2.0',
      template: `You are an expert UK construction professional specializing in side extensions. Generate a comprehensive Scope of Work following RICS, RIBA Plan of Work, NRM1/NRM2, and NHBC standards.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

Focus on boundary considerations, matching materials, and structural integration with existing building.

TECHNICAL SPECIFICATIONS must include:
- Foundation design considering existing foundations
- Structural calculations for wall removal/modification
- Roof integration and weatherproofing details
- External wall construction matching existing
- Window and door specifications
- Internal layout and circulation
- Services integration (heating, electrical, plumbing)

WORK PHASES should address:
- Site preparation and access
- Excavation and foundations
- Structural alterations to existing building
- New structure construction
- Roof works and weatherproofing
- Services installation
- Internal finishes
- External works and boundary treatments

COMPLIANCE REQUIREMENTS:
- Planning permission considerations
- Building regulations approval
- Party wall procedures if applicable
- Boundary distance requirements
- Matching materials requirements

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must address boundary distance requirements',
        'Must specify material matching strategy',
        'Must include structural integration details'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 48000,
        successRate: 0.90,
        averageConfidence: 0.83,
        userSatisfaction: 4.3,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getBathroomRenovationTemplate(): AIPromptTemplate {
    return {
      id: 'bathroom-renovation-v1.8',
      name: 'Bathroom Renovation SoW Generator',
      projectType: 'bathroom-renovation',
      version: '1.8',
      template: `You are an expert UK construction professional specializing in bathroom renovations. Generate a comprehensive Scope of Work following industry best practices and building regulations.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

TECHNICAL SPECIFICATIONS must include:
- Waterproofing strategy and materials
- Plumbing layout and pipe sizing
- Electrical requirements (zones, IP ratings)
- Ventilation requirements and fan specifications
- Tiling specifications and adhesives
- Sanitaryware specifications and installation
- Heating requirements (towel rails, underfloor)
- Lighting design and IP ratings
- Accessibility considerations

MATERIALS LIST should include:
- Waterproofing membranes and sealants
- Plumbing fixtures and fittings
- Electrical components (IP65 rated)
- Tiles, adhesives, and grouts
- Sanitaryware and accessories
- Heating components
- Ventilation equipment

WORK PHASES:
- Strip out and preparation
- First fix plumbing and electrical
- Waterproofing installation
- Tiling and wall finishes
- Second fix plumbing and electrical
- Final finishes and commissioning

COMPLIANCE REQUIREMENTS:
- Building regulations Part G (hygiene)
- Electrical safety (Part P)
- Ventilation requirements (Part F)
- Water efficiency requirements
- Accessibility standards where applicable

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include waterproofing strategy',
        'Must specify electrical zone requirements',
        'Must address ventilation requirements'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 35000,
        successRate: 0.94,
        averageConfidence: 0.90,
        userSatisfaction: 4.7,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getKitchenRenovationTemplate(): AIPromptTemplate {
    return {
      id: 'kitchen-renovation-v1.9',
      name: 'Kitchen Renovation SoW Generator',
      projectType: 'kitchen-renovation',
      version: '1.9',
      template: `You are an expert UK construction professional specializing in kitchen renovations. Generate a comprehensive Scope of Work following industry standards and building regulations.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

TECHNICAL SPECIFICATIONS must include:
- Kitchen layout and work triangle optimization
- Electrical requirements for appliances
- Plumbing layout for sinks and appliances
- Ventilation and extraction requirements
- Lighting design (task, ambient, accent)
- Worktop specifications and support requirements
- Unit specifications and installation methods
- Appliance specifications and integration
- Flooring specifications and preparation

MATERIALS LIST should include:
- Kitchen units and hardware
- Worktops and edge treatments
- Appliances and integration kits
- Electrical components and circuits
- Plumbing fixtures and connections
- Extraction equipment
- Lighting fixtures and controls
- Flooring materials and preparation
- Wall finishes and splashbacks

WORK PHASES:
- Strip out and preparation
- First fix electrical and plumbing
- Unit installation and worktops
- Appliance installation and connection
- Second fix electrical and plumbing
- Final finishes and commissioning

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include appliance electrical requirements',
        'Must specify extraction requirements',
        'Must address work triangle efficiency'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 38000,
        successRate: 0.93,
        averageConfidence: 0.89,
        userSatisfaction: 4.5,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getConservatoryTemplate(): AIPromptTemplate {
    return {
      id: 'conservatory-v1.7',
      name: 'Conservatory SoW Generator',
      projectType: 'conservatory',
      version: '1.7',
      template: `You are an expert UK construction professional specializing in conservatories. Generate a comprehensive Scope of Work following building regulations and industry standards.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

TECHNICAL SPECIFICATIONS must include:
- Foundation design and thermal break
- Frame specifications (uPVC, aluminum, timber)
- Glazing specifications and thermal performance
- Roof design and drainage
- Ventilation requirements and systems
- Heating considerations
- Door and window specifications
- Integration with existing building
- Thermal separation requirements

MATERIALS LIST should include:
- Foundation materials and DPC
- Frame materials and fixings
- Glazing units and seals
- Roofing materials and insulation
- Drainage components
- Ventilation equipment
- Heating components
- Door and window hardware

WORK PHASES:
- Excavation and foundations
- Frame erection
- Glazing installation
- Roofing and weatherproofing
- Services installation
- Final finishes and commissioning

COMPLIANCE REQUIREMENTS:
- Building regulations compliance
- Thermal separation requirements
- Drainage and surface water management
- Structural calculations if required

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include thermal separation details',
        'Must specify drainage strategy',
        'Must address ventilation requirements'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 40000,
        successRate: 0.91,
        averageConfidence: 0.86,
        userSatisfaction: 4.2,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getGarageConversionTemplate(): AIPromptTemplate {
    return {
      id: 'garage-conversion-v1.6',
      name: 'Garage Conversion SoW Generator',
      projectType: 'garage-conversion',
      version: '1.6',
      template: `You are an expert UK construction professional specializing in garage conversions. Generate a comprehensive Scope of Work following building regulations and industry standards.

TECHNICAL SPECIFICATIONS must include:
- Insulation strategy for walls, floor, and roof
- Damp proofing and ventilation
- Floor level adjustments and insulation
- Window and door installation
- Electrical installation and circuits
- Heating system integration
- Internal wall construction
- Ceiling construction and insulation

WORK PHASES:
- Preparation and door removal
- Insulation and damp proofing
- Window and door installation
- First fix electrical and heating
- Internal wall and ceiling construction
- Second fix and finishes

COMPLIANCE REQUIREMENTS:
- Building regulations approval
- Thermal performance requirements
- Ventilation requirements
- Electrical safety compliance

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include insulation strategy',
        'Must address damp proofing',
        'Must specify floor level adjustments'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 42000,
        successRate: 0.89,
        averageConfidence: 0.84,
        userSatisfaction: 4.1,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getBasementConversionTemplate(): AIPromptTemplate {
    return {
      id: 'basement-conversion-v2.2',
      name: 'Basement Conversion SoW Generator',
      projectType: 'basement-conversion',
      version: '2.2',
      template: `You are an expert UK construction professional specializing in basement conversions. Generate a comprehensive Scope of Work following RICS, RIBA Plan of Work, and building regulations.

TECHNICAL SPECIFICATIONS must include:
- Structural assessment and calculations
- Waterproofing strategy (tanking/cavity drainage)
- Excavation and underpinning requirements
- Ventilation and dehumidification systems
- Emergency egress requirements
- Ceiling height and headroom
- Electrical installation (moisture considerations)
- Heating and insulation strategy
- Drainage and pumping systems

WORK PHASES:
- Structural assessment and design
- Excavation and underpinning
- Waterproofing installation
- Structural works
- Services installation
- Internal construction
- Finishes and commissioning

COMPLIANCE REQUIREMENTS:
- Planning permission requirements
- Building regulations approval
- Structural engineer involvement
- Party wall considerations
- Emergency egress compliance

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include structural assessment',
        'Must specify waterproofing strategy',
        'Must address emergency egress',
        'Must include ceiling height requirements'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 55000,
        successRate: 0.87,
        averageConfidence: 0.81,
        userSatisfaction: 4.0,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getRoofReplacementTemplate(): AIPromptTemplate {
    return {
      id: 'roof-replacement-v1.5',
      name: 'Roof Replacement SoW Generator',
      projectType: 'roof-replacement',
      version: '1.5',
      template: `You are an expert UK construction professional specializing in roof replacement. Generate a comprehensive Scope of Work following building regulations and industry standards.

TECHNICAL SPECIFICATIONS must include:
- Structural assessment of existing roof
- New roof covering specifications
- Insulation upgrade requirements
- Ventilation strategy
- Guttering and drainage
- Scaffolding and access requirements
- Weather protection during works
- Waste disposal strategy

WORK PHASES:
- Scaffolding and weather protection
- Strip out of existing covering
- Structural repairs and upgrades
- Insulation installation
- New covering installation
- Guttering and drainage
- Final inspections and cleanup

COMPLIANCE REQUIREMENTS:
- Building regulations approval
- Structural engineer involvement if required
- CDM regulations compliance
- Waste disposal licensing

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must include structural assessment',
        'Must specify insulation requirements',
        'Must address weather protection'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 44000,
        successRate: 0.88,
        averageConfidence: 0.82,
        userSatisfaction: 4.2,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  private static getGenericTemplate(): AIPromptTemplate {
    return {
      id: 'generic-project-v1.0',
      name: 'Generic Project SoW Generator',
      projectType: 'other',
      version: '1.0',
      template: `You are an expert UK construction professional. Generate a comprehensive Scope of Work following RICS, RIBA Plan of Work, and relevant building regulations based on the project description provided.

PROJECT CONTEXT:
- Project Type: {{projectType}}
- Property Address: {{propertyAddress}}
- Requirements: {{requirements}}
- Council Data: {{councilData}}
- Documents: {{documents}}
- Preferences: {{preferences}}

Analyze the project requirements and generate appropriate:
- RIBA stages relevant to the project
- Technical specifications
- Materials list
- Work phases
- Compliance requirements
- Deliverables

Ensure all specifications are detailed, measurable, and compliant with UK building standards.

OUTPUT FORMAT: Structured JSON with detailed specifications.`,
      variables: this.BASE_VARIABLES,
      examples: [],
      validationRules: [
        'Must analyze project requirements thoroughly',
        'Must include relevant building regulations',
        'Must provide detailed specifications'
      ],
      lastUpdated: '2024-01-15T10:00:00Z',
      performance: {
        averageGenerationTime: 60000,
        successRate: 0.75,
        averageConfidence: 0.70,
        userSatisfaction: 3.8,
        lastEvaluated: '2024-01-10T10:00:00Z'
      }
    };
  }

  static interpolateTemplate(template: string, variables: Record<string, any>): string {
    let interpolated = template;
    
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      const replacement = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
      interpolated = interpolated.replace(new RegExp(placeholder, 'g'), replacement);
    });

    return interpolated;
  }

  static validateTemplateVariables(template: AIPromptTemplate, variables: Record<string, any>): string[] {
    const errors: string[] = [];

    template.variables.forEach(variable => {
      if (variable.required && !(variable.name in variables)) {
        errors.push(`Required variable '${variable.name}' is missing`);
      }

      if (variable.name in variables) {
        const value = variables[variable.name];
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        
        if (actualType !== variable.type) {
          errors.push(`Variable '${variable.name}' should be of type '${variable.type}' but got '${actualType}'`);
        }
      }
    });

    return errors;
  }
}