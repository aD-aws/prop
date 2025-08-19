import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { bedrockClient } from '../config/aws';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  ComplianceCheckResult,
  ComplianceScore,
  ComplianceViolation,
  RICSStandardsCheck,
  RIBAStageValidation,
  NHBCStandardsCheck,
  BuildingControlRequirement,
  ComplianceKnowledgeBase,
  ProjectType,
  Document,
  ProjectRequirements
} from '../types';

export class ComplianceService {
  private readonly bedrockModelId = config.bedrock.modelId;
  private readonly knowledgeBase: ComplianceKnowledgeBase;

  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Perform comprehensive compliance check on project
   */
  async performComplianceCheck(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    documents: Document[]
  ): Promise<ComplianceCheckResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting compliance check', { projectType });

      // Run parallel compliance checks
      const [
        ricsCheck,
        ribaCheck,
        nhbcCheck,
        buildingControlCheck,
        overallScore
      ] = await Promise.all([
        this.checkRICSStandards(projectType, requirements, documents),
        this.validateRIBAStages(projectType, requirements),
        this.checkNHBCStandards(projectType, requirements, documents),
        this.checkBuildingControlRequirements(projectType, requirements),
        this.calculateComplianceScore(projectType, requirements, documents)
      ]);

      const processingTime = Date.now() - startTime;
      const checkedAt = new Date().toISOString();

      const result: ComplianceCheckResult = {
        projectType,
        overallScore,
        ricsCompliance: ricsCheck,
        ribaCompliance: ribaCheck,
        nhbcCompliance: nhbcCheck,
        buildingControlRequirements: buildingControlCheck,
        violations: this.aggregateViolations([ricsCheck, ribaCheck, nhbcCheck]),
        recommendations: await this.generateRecommendations(projectType, requirements, [ricsCheck, ribaCheck, nhbcCheck]),
        checkedAt,
        processingTime
      };

      logger.info('Compliance check completed', { 
        projectType, 
        overallScore: overallScore.score,
        processingTime 
      });

      return result;

    } catch (error) {
      logger.error('Compliance check failed', { error, projectType });
      
      // Return a failsafe result instead of throwing
      const processingTime = Date.now() - startTime;
      const checkedAt = new Date().toISOString();

      return {
        projectType,
        overallScore: {
          score: 50,
          confidence: 0.3,
          breakdown: {},
          riskLevel: 'medium',
          explanation: 'Unable to complete automated compliance check'
        },
        ricsCompliance: this.getFailsafeRICSCheck(),
        ribaCompliance: this.getFailsafeRIBAValidation(),
        nhbcCompliance: this.getFailsafeNHBCCheck(),
        buildingControlRequirements: this.getFailsafeBuildingControlRequirements(projectType),
        violations: [],
        recommendations: ['Consult with qualified professionals for detailed compliance review'],
        checkedAt,
        processingTime
      };
    }
  }

  /**
   * Check RICS professional standards compliance
   */
  private async checkRICSStandards(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    documents: Document[]
  ): Promise<RICSStandardsCheck> {
    const prompt = `
You are a RICS (Royal Institution of Chartered Surveyors) compliance expert specializing in UK construction standards.

Analyze the following project for RICS professional standards compliance:

Project Type: ${projectType}
Project Requirements: ${JSON.stringify(requirements, null, 2)}
Documents Available: ${documents.map(d => `${d.classification?.type || 'unknown'}: ${d.originalName}`).join(', ')}

RICS Standards to check:
1. RICS Professional Standards and Guidance (Red Book)
2. RICS Surveying Safely principles
3. RICS Construction Standards
4. RICS Valuation Standards
5. RICS Building Surveying Standards
6. RICS Project Management Standards

Evaluate compliance in these areas:
- Professional competence requirements
- Structural survey requirements
- Valuation methodology compliance
- Health and safety standards
- Quality assurance processes
- Documentation standards
- Client care standards

Respond with JSON:
{
  "compliant": boolean,
  "score": number (0-100),
  "standardsChecked": ["standard1", "standard2"],
  "violations": [
    {
      "standard": "RICS standard name",
      "severity": "low|medium|high|critical",
      "description": "violation description",
      "requirement": "specific requirement",
      "recommendation": "how to fix"
    }
  ],
  "requiredActions": ["action1", "action2"],
  "aiAnalysis": "detailed analysis explanation"
}
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        compliant: analysis.compliant || false,
        score: analysis.score || 0,
        standardsChecked: analysis.standardsChecked || [],
        violations: analysis.violations || [],
        requiredActions: analysis.requiredActions || [],
        aiAnalysis: analysis.aiAnalysis || 'RICS standards analysis completed'
      };

    } catch (error) {
      logger.error('RICS standards check failed', { error });
      return this.getFailsafeRICSCheck();
    }
  }

  /**
   * Validate RIBA Plan of Work stages
   */
  private async validateRIBAStages(
    projectType: ProjectType,
    requirements: ProjectRequirements
  ): Promise<RIBAStageValidation> {
    const prompt = `
You are a RIBA (Royal Institute of British Architects) Plan of Work expert.

Analyze this project against RIBA Plan of Work 2020 stages:

Project Type: ${projectType}
Project Requirements: ${JSON.stringify(requirements, null, 2)}

RIBA Plan of Work Stages:
- Stage 0: Strategic Definition
- Stage 1: Preparation and Briefing
- Stage 2: Concept Design
- Stage 3: Spatial Coordination
- Stage 4: Technical Design
- Stage 5: Manufacturing and Construction
- Stage 6: Handover
- Stage 7: Use

For this project type, evaluate:
1. Which stages are applicable
2. Current stage based on available information
3. Required deliverables for each applicable stage
4. Missing information or documentation
5. Stage-specific compliance requirements

Respond with JSON:
{
  "currentStage": number (0-7),
  "applicableStages": [0, 1, 2, 3, 4, 5, 6, 7],
  "stageValidation": [
    {
      "stage": number,
      "stageName": "stage name",
      "required": boolean,
      "compliant": boolean,
      "deliverables": ["deliverable1", "deliverable2"],
      "missingItems": ["missing1", "missing2"],
      "recommendations": ["rec1", "rec2"]
    }
  ],
  "overallCompliance": boolean,
  "nextStageRequirements": ["requirement1", "requirement2"],
  "aiAnalysis": "detailed RIBA analysis"
}
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        currentStage: analysis.currentStage || 0,
        applicableStages: analysis.applicableStages || [0, 1, 2, 3, 4],
        stageValidation: analysis.stageValidation || [],
        overallCompliance: analysis.overallCompliance || false,
        nextStageRequirements: analysis.nextStageRequirements || [],
        aiAnalysis: analysis.aiAnalysis || 'RIBA Plan of Work validation completed'
      };

    } catch (error) {
      logger.error('RIBA stage validation failed', { error });
      return this.getFailsafeRIBAValidation();
    }
  }

  /**
   * Check NHBC standards for residential projects
   */
  private async checkNHBCStandards(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    documents: Document[]
  ): Promise<NHBCStandardsCheck> {
    // Only applicable for residential projects
    const residentialTypes = ['loft-conversion', 'rear-extension', 'side-extension', 'conservatory', 'garage-conversion', 'basement-conversion'];
    
    if (!residentialTypes.includes(projectType)) {
      return {
        applicable: false,
        compliant: true,
        score: 100,
        standardsChecked: [],
        violations: [],
        warrantyEligible: false,
        aiAnalysis: 'NHBC standards not applicable for this project type'
      };
    }

    const prompt = `
You are an NHBC (National House Building Council) standards expert for UK residential construction.

Analyze this residential project for NHBC Standards compliance:

Project Type: ${projectType}
Project Requirements: ${JSON.stringify(requirements, null, 2)}
Documents: ${documents.map(d => `${d.classification?.type || 'unknown'}: ${d.originalName}`).join(', ')}

NHBC Standards to check:
1. Foundation standards (Chapter 4.1)
2. Structural frame standards (Chapter 6.1)
3. Roof structure standards (Chapter 7.1)
4. Thermal insulation standards (Chapter 6.2)
5. Damp-proofing standards (Chapter 5.4)
6. Electrical installation standards (Chapter 8.1)
7. Plumbing standards (Chapter 8.2)
8. Health and safety standards
9. Warranty requirements

Evaluate:
- Structural adequacy
- Thermal performance
- Moisture control
- Safety compliance
- Warranty eligibility
- Quality standards

Respond with JSON:
{
  "applicable": true,
  "compliant": boolean,
  "score": number (0-100),
  "standardsChecked": ["Chapter 4.1", "Chapter 6.1"],
  "violations": [
    {
      "chapter": "NHBC chapter reference",
      "severity": "low|medium|high|critical",
      "description": "violation description",
      "requirement": "specific NHBC requirement",
      "recommendation": "remedial action"
    }
  ],
  "warrantyEligible": boolean,
  "warrantyConditions": ["condition1", "condition2"],
  "aiAnalysis": "detailed NHBC analysis"
}
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        applicable: true,
        compliant: analysis.compliant || false,
        score: analysis.score || 0,
        standardsChecked: analysis.standardsChecked || [],
        violations: analysis.violations || [],
        warrantyEligible: analysis.warrantyEligible || false,
        warrantyConditions: analysis.warrantyConditions || [],
        aiAnalysis: analysis.aiAnalysis || 'NHBC standards analysis completed'
      };

    } catch (error) {
      logger.error('NHBC standards check failed', { error });
      return this.getFailsafeNHBCCheck();
    }
  }

  /**
   * Check Building Control approval requirements
   */
  private async checkBuildingControlRequirements(
    projectType: ProjectType,
    requirements: ProjectRequirements
  ): Promise<BuildingControlRequirement[]> {
    const prompt = `
You are a UK Building Control expert familiar with Building Regulations 2010 and amendments.

Analyze this project for Building Control approval requirements:

Project Type: ${projectType}
Project Requirements: ${JSON.stringify(requirements, null, 2)}

Building Regulations to consider:
- Part A: Structure
- Part B: Fire Safety
- Part C: Site preparation and resistance to contaminants and moisture
- Part D: Toxic substances
- Part E: Resistance to the passage of sound
- Part F: Ventilation
- Part G: Sanitation, hot water safety and water efficiency
- Part H: Drainage and waste disposal
- Part J: Combustion appliances and fuel storage systems
- Part K: Protection from falling, collision and impact
- Part L: Conservation of fuel and power
- Part M: Access to and use of buildings
- Part N: Glazing
- Part P: Electrical safety
- Part Q: Security
- Part R: Physical infrastructure for high-speed electronic communications networks

Determine:
1. Which Building Regulations apply
2. Whether Building Control approval is required
3. Type of application needed (Full Plans vs Building Notice)
4. Required documentation
5. Inspection requirements
6. Compliance certificates needed

Respond with JSON array:
[
  {
    "regulation": "Part A - Structure",
    "required": boolean,
    "applicationType": "Full Plans|Building Notice|Not Required",
    "reason": "why this regulation applies",
    "documentation": ["structural calculations", "drawings"],
    "inspections": ["foundation inspection", "structural inspection"],
    "certificates": ["structural engineer certificate"],
    "timeline": "typical approval timeline",
    "fees": "estimated fees range"
  }
]
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const requirements = this.parseAIResponse(response);

      return Array.isArray(requirements) ? requirements : [];

    } catch (error) {
      logger.error('Building Control requirements check failed', { error });
      return this.getFailsafeBuildingControlRequirements(projectType);
    }
  }

  /**
   * Calculate overall compliance score
   */
  private async calculateComplianceScore(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    documents: Document[]
  ): Promise<ComplianceScore> {
    const prompt = `
You are a UK construction compliance expert. Calculate an overall compliance score for this project.

Project Type: ${projectType}
Project Requirements: ${JSON.stringify(requirements, null, 2)}
Documents Available: ${documents.length} documents

Consider:
1. Completeness of project information
2. Document quality and relevance
3. Regulatory compliance readiness
4. Professional standards alignment
5. Risk factors

Provide a weighted score considering:
- Documentation completeness (25%)
- Regulatory compliance (30%)
- Professional standards (25%)
- Risk assessment (20%)

Respond with JSON:
{
  "score": number (0-100),
  "confidence": number (0-1),
  "breakdown": {
    "documentation": number (0-100),
    "regulatory": number (0-100),
    "professional": number (0-100),
    "risk": number (0-100)
  },
  "riskLevel": "low|medium|high|critical",
  "explanation": "detailed scoring explanation"
}
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const analysis = this.parseAIResponse(response);

      return {
        score: analysis.score || 0,
        confidence: analysis.confidence || 0.5,
        breakdown: analysis.breakdown || {},
        riskLevel: analysis.riskLevel || 'medium',
        explanation: analysis.explanation || 'Compliance score calculated'
      };

    } catch (error) {
      logger.error('Compliance score calculation failed', { error });
      return {
        score: 50,
        confidence: 0.3,
        breakdown: {},
        riskLevel: 'medium',
        explanation: 'Unable to calculate detailed compliance score'
      };
    }
  }

  /**
   * Generate AI-powered recommendations
   */
  private async generateRecommendations(
    projectType: ProjectType,
    requirements: ProjectRequirements,
    complianceChecks: (RICSStandardsCheck | RIBAStageValidation | NHBCStandardsCheck)[]
  ): Promise<string[]> {
    const violations = this.aggregateViolations(complianceChecks);
    
    const prompt = `
You are a UK construction compliance consultant. Generate actionable recommendations to improve project compliance.

Project Type: ${projectType}
Identified Violations: ${JSON.stringify(violations, null, 2)}

Provide prioritized recommendations that:
1. Address critical compliance issues first
2. Suggest specific actions to take
3. Reference relevant standards and regulations
4. Include timeline considerations
5. Mention professional consultations needed

Respond with JSON array of strings:
["recommendation 1", "recommendation 2", "recommendation 3"]
`;

    try {
      const response = await this.invokeBedrockModel(prompt);
      const recommendations = this.parseAIResponse(response);

      return Array.isArray(recommendations) ? recommendations : [];

    } catch (error) {
      logger.error('Recommendations generation failed', { error });
      return ['Consult with qualified professionals for detailed compliance review'];
    }
  }

  /**
   * Aggregate violations from multiple compliance checks
   */
  private aggregateViolations(complianceChecks: any[]): ComplianceViolation[] {
    const violations: ComplianceViolation[] = [];

    complianceChecks.forEach(check => {
      if (check.violations && Array.isArray(check.violations)) {
        violations.push(...check.violations);
      }
    });

    return violations;
  }

  /**
   * Invoke Bedrock model with error handling
   */
  private async invokeBedrockModel(prompt: string): Promise<string> {
    const command = new InvokeModelCommand({
      modelId: this.bedrockModelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: prompt
        }]
      }),
      contentType: "application/json",
      accept: "application/json"
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.content[0].text;
  }

  /**
   * Parse AI response with error handling
   */
  private parseAIResponse(response: string): any {
    try {
      // First try to parse the entire response as JSON
      try {
        return JSON.parse(response);
      } catch {
        // If that fails, look for JSON objects or arrays in the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        
        // Try parsing array response
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          return JSON.parse(arrayMatch[0]);
        }
      }

      return {};
    } catch (error) {
      logger.error('Failed to parse AI response', { error, response: response.substring(0, 200) });
      return {};
    }
  }

  /**
   * Initialize compliance knowledge base
   */
  private initializeKnowledgeBase(): ComplianceKnowledgeBase {
    return {
      buildingRegulations: {
        'Part A': 'Structure - Covers structural safety, loading, ground movement',
        'Part B': 'Fire Safety - Fire detection, escape routes, fire resistance',
        'Part C': 'Site preparation and resistance to contaminants and moisture',
        'Part L': 'Conservation of fuel and power - Energy efficiency, insulation',
        'Part M': 'Access to and use of buildings - Accessibility requirements',
        'Part P': 'Electrical safety - Electrical installation standards'
      },
      ricsStandards: [
        'RICS Professional Standards and Guidance',
        'RICS Surveying Safely',
        'RICS Construction Standards',
        'RICS Building Surveying Standards'
      ],
      ribaStages: {
        0: 'Strategic Definition',
        1: 'Preparation and Briefing',
        2: 'Concept Design',
        3: 'Spatial Coordination',
        4: 'Technical Design',
        5: 'Manufacturing and Construction',
        6: 'Handover',
        7: 'Use'
      },
      nhbcChapters: {
        '4.1': 'Foundations',
        '6.1': 'Structural frame',
        '7.1': 'Roof structure',
        '6.2': 'Thermal insulation',
        '5.4': 'Damp-proofing'
      }
    };
  }

  /**
   * Failsafe RICS check when AI fails
   */
  private getFailsafeRICSCheck(): RICSStandardsCheck {
    return {
      compliant: false,
      score: 50,
      standardsChecked: ['RICS Professional Standards'],
      violations: [{
        standard: 'RICS Professional Standards',
        severity: 'medium',
        description: 'Unable to perform automated RICS compliance check',
        requirement: 'Professional review required',
        recommendation: 'Consult with RICS qualified surveyor'
      }],
      requiredActions: ['Obtain professional RICS compliance review'],
      aiAnalysis: 'Automated RICS check unavailable - professional review recommended'
    };
  }

  /**
   * Failsafe RIBA validation when AI fails
   */
  private getFailsafeRIBAValidation(): RIBAStageValidation {
    return {
      currentStage: 1,
      applicableStages: [0, 1, 2, 3, 4],
      stageValidation: [],
      overallCompliance: false,
      nextStageRequirements: ['Professional RIBA Plan of Work review'],
      aiAnalysis: 'Automated RIBA validation unavailable - professional review recommended'
    };
  }

  /**
   * Failsafe NHBC check when AI fails
   */
  private getFailsafeNHBCCheck(): NHBCStandardsCheck {
    return {
      applicable: true,
      compliant: false,
      score: 50,
      standardsChecked: [],
      violations: [{
        chapter: 'General',
        severity: 'medium',
        description: 'Unable to perform automated NHBC compliance check',
        requirement: 'Professional review required',
        recommendation: 'Consult with NHBC approved inspector'
      }],
      warrantyEligible: false,
      warrantyConditions: ['Professional NHBC compliance review required'],
      aiAnalysis: 'Automated NHBC check unavailable - professional review recommended'
    };
  }

  /**
   * Failsafe Building Control requirements
   */
  private getFailsafeBuildingControlRequirements(projectType: ProjectType): BuildingControlRequirement[] {
    const commonRequirements: BuildingControlRequirement[] = [
      {
        regulation: 'Part A - Structure',
        required: true,
        applicationType: 'Full Plans',
        reason: 'Structural modifications require Building Control approval',
        documentation: ['Structural calculations', 'Technical drawings'],
        inspections: ['Foundation inspection', 'Structural inspection'],
        certificates: ['Structural engineer certificate'],
        timeline: '4-6 weeks',
        fees: '£200-£800'
      }
    ];

    return commonRequirements;
  }
}

export const complianceService = new ComplianceService();