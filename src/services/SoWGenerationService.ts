import { 
  ScopeOfWork,
  SoWGenerationRequest,
  SoWGenerationResult,
  SoWGenerationPreferences,
  AIGenerationMetadata,
  RibaStage,
  Specification,
  MaterialList,
  WorkPhase,
  Deliverable,
  CostEstimate,
  ProjectType,
  ProjectRequirements,
  Document,
  CouncilData,
  SoWValidationResult,
  ValidationIssue
} from '../types';
import { ScopeOfWorkModel } from '../models/ScopeOfWork';
import { SoWPromptTemplates } from './prompts/SoWPromptTemplates';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class SoWGenerationService {
  private bedrockClient: BedrockRuntimeClient;
  private dynamoClient: DynamoDBDocumentClient;

  constructor() {
    this.bedrockClient = new BedrockRuntimeClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    
    const dynamoClient = new DynamoDBClient({ 
      region: process.env.AWS_REGION || 'us-east-1' 
    });
    this.dynamoClient = DynamoDBDocumentClient.from(dynamoClient);
  }

  async generateScopeOfWork(request: SoWGenerationRequest): Promise<SoWGenerationResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting SoW generation', { 
        projectId: request.projectId, 
        projectType: request.projectType 
      });

      // Validate request
      const validationErrors = this.validateRequest(request);
      if (validationErrors.length > 0) {
        return {
          success: false,
          generationTime: Date.now() - startTime,
          warnings: [],
          errors: validationErrors,
          recommendations: [],
          nextSteps: [],
          estimatedCost: 0,
          confidence: 0
        };
      }

      // Get AI prompt template for project type
      const promptTemplate = SoWPromptTemplates.getPromptTemplate(request.projectType);
      
      // Prepare variables for template interpolation
      const templateVariables = {
        projectType: request.projectType,
        propertyAddress: request.requirements.description, // Using description as address context
        requirements: request.requirements,
        councilData: request.councilData,
        documents: request.documents,
        preferences: request.preferences
      };

      // Validate template variables
      const templateErrors = SoWPromptTemplates.validateTemplateVariables(promptTemplate, templateVariables);
      if (templateErrors.length > 0) {
        return {
          success: false,
          generationTime: Date.now() - startTime,
          warnings: [],
          errors: templateErrors,
          recommendations: [],
          nextSteps: [],
          estimatedCost: 0,
          confidence: 0
        };
      }

      // Generate SoW using AI
      const aiResult = await this.generateWithAI(promptTemplate, templateVariables);
      
      if (!aiResult.success) {
        return {
          success: false,
          generationTime: Date.now() - startTime,
          warnings: [],
          errors: [aiResult.error || 'AI generation failed'],
          recommendations: [],
          nextSteps: [],
          estimatedCost: 0,
          confidence: 0
        };
      }

      // Create ScopeOfWork model
      const sow = ScopeOfWorkModel.create({
        projectId: request.projectId,
        projectType: request.projectType,
        requirements: request.requirements,
        ribaStages: aiResult.ribaStages || [],
        specifications: aiResult.specifications || [],
        materials: aiResult.materials || this.createDefaultMaterialsList(),
        costEstimate: aiResult.costEstimate || this.createDefaultCostEstimate(),
        workPhases: aiResult.workPhases || [],
        deliverables: aiResult.deliverables || [],
        aiGenerationMetadata: aiResult.metadata
      });

      // Validate generated SoW
      const validationResult = await this.validateGeneratedSoW(sow);
      const sowWithValidation = ScopeOfWorkModel.addValidationResult(sow, validationResult);

      // Save to database
      await this.saveScopeOfWork(sowWithValidation);

      const generationTime = Date.now() - startTime;
      
      logger.info('SoW generation completed', { 
        projectId: request.projectId,
        sowId: sow.id,
        generationTime,
        confidence: aiResult.metadata.confidence
      });

      return {
        success: true,
        sowId: sow.id,
        sow: ScopeOfWorkModel.sanitizeForResponse(sowWithValidation),
        generationTime,
        warnings: aiResult.warnings || [],
        errors: [],
        recommendations: this.generateRecommendations(sowWithValidation),
        nextSteps: this.generateNextSteps(sowWithValidation),
        estimatedCost: ScopeOfWorkModel.calculateTotalCost(sowWithValidation),
        confidence: aiResult.metadata.confidence
      };

    } catch (error) {
      logger.error('SoW generation failed', { 
        projectId: request.projectId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      return {
        success: false,
        generationTime: Date.now() - startTime,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
        recommendations: [],
        nextSteps: [],
        estimatedCost: 0,
        confidence: 0
      };
    }
  }

  private async generateWithAI(
    promptTemplate: any, 
    variables: Record<string, any>
  ): Promise<{
    success: boolean;
    error?: string;
    ribaStages?: RibaStage[];
    specifications?: Specification[];
    materials?: MaterialList;
    costEstimate?: CostEstimate;
    workPhases?: WorkPhase[];
    deliverables?: Deliverable[];
    metadata: AIGenerationMetadata;
    warnings?: string[];
  }> {
    const startTime = Date.now();
    
    try {
      // Interpolate template with variables
      const prompt = SoWPromptTemplates.interpolateTemplate(promptTemplate.template, variables);
      
      // Prepare Bedrock request
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 4000,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ]
      };

      const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(requestBody)
      });

      const response = await this.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      if (!responseBody.content || !responseBody.content[0] || !responseBody.content[0].text) {
        throw new Error('Invalid response from Bedrock');
      }

      const aiResponse = responseBody.content[0].text;
      const tokensUsed = responseBody.usage?.input_tokens + responseBody.usage?.output_tokens || 0;

      // Parse AI response
      const parsedResult = this.parseAIResponse(aiResponse, variables.projectType);
      
      const metadata: AIGenerationMetadata = {
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        version: "2.0",
        promptVersion: promptTemplate.version,
        generationTime: Date.now() - startTime,
        tokensUsed,
        confidence: parsedResult.confidence,
        iterationsRequired: 1,
        validationPassed: parsedResult.success,
        knowledgeBaseSources: ['RICS', 'RIBA', 'NRM1', 'NRM2', 'NHBC', 'Building Regulations'],
        customizations: []
      };

      return {
        success: parsedResult.success,
        error: parsedResult.error,
        ribaStages: parsedResult.ribaStages,
        specifications: parsedResult.specifications,
        materials: parsedResult.materials,
        costEstimate: parsedResult.costEstimate,
        workPhases: parsedResult.workPhases,
        deliverables: parsedResult.deliverables,
        metadata,
        warnings: parsedResult.warnings
      };

    } catch (error) {
      logger.error('AI generation failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      
      const metadata: AIGenerationMetadata = {
        model: "anthropic.claude-3-5-sonnet-20241022-v2:0",
        version: "2.0",
        promptVersion: promptTemplate.version,
        generationTime: Date.now() - startTime,
        tokensUsed: 0,
        confidence: 0,
        iterationsRequired: 1,
        validationPassed: false,
        knowledgeBaseSources: [],
        customizations: []
      };

      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI generation failed',
        metadata
      };
    }
  }

  private parseAIResponse(aiResponse: string, projectType: ProjectType): {
    success: boolean;
    error?: string;
    confidence: number;
    ribaStages?: RibaStage[];
    specifications?: Specification[];
    materials?: MaterialList;
    costEstimate?: CostEstimate;
    workPhases?: WorkPhase[];
    deliverables?: Deliverable[];
    warnings?: string[];
  } {
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // If no JSON found, create structured response from text
        return this.parseTextResponse(aiResponse, projectType);
      }

      const parsedData = JSON.parse(jsonMatch[0]);
      
      return {
        success: true,
        confidence: 0.85, // Default confidence for successful parsing
        ribaStages: this.parseRibaStages(parsedData.ribaStages || []),
        specifications: this.parseSpecifications(parsedData.specifications || []),
        materials: this.parseMaterials(parsedData.materials || {}),
        costEstimate: this.parseCostEstimate(parsedData.costEstimate || {}),
        workPhases: this.parseWorkPhases(parsedData.workPhases || []),
        deliverables: this.parseDeliverables(parsedData.deliverables || []),
        warnings: parsedData.warnings || []
      };

    } catch (error) {
      logger.warn('Failed to parse AI response as JSON, falling back to text parsing', { error });
      return this.parseTextResponse(aiResponse, projectType);
    }
  }

  private parseTextResponse(aiResponse: string, projectType: ProjectType): {
    success: boolean;
    confidence: number;
    ribaStages: RibaStage[];
    specifications: Specification[];
    materials: MaterialList;
    costEstimate: CostEstimate;
    workPhases: WorkPhase[];
    deliverables: Deliverable[];
    warnings: string[];
  } {
    // Create basic structure from project type defaults
    const defaults = ScopeOfWorkModel.getProjectTypeDefaults(projectType);
    
    return {
      success: true,
      confidence: 0.65, // Lower confidence for text parsing
      ribaStages: this.createDefaultRibaStages(defaults.ribaStages),
      specifications: this.createDefaultSpecifications(defaults.specifications),
      materials: this.createDefaultMaterialsList(),
      costEstimate: this.createDefaultCostEstimate(),
      workPhases: this.createDefaultWorkPhases(defaults.workPhases),
      deliverables: this.createDefaultDeliverables(defaults.deliverables),
      warnings: ['AI response was parsed as text due to JSON parsing failure']
    };
  }

  private parseRibaStages(stages: any[]): RibaStage[] {
    return stages.map((stage, index) => ({
      stage: stage.stage || index,
      title: stage.title || `Stage ${index}`,
      description: stage.description || '',
      deliverables: Array.isArray(stage.deliverables) ? stage.deliverables : [],
      duration: stage.duration || 7,
      dependencies: Array.isArray(stage.dependencies) ? stage.dependencies : [],
      workPackages: Array.isArray(stage.workPackages) ? stage.workPackages : [],
      milestones: Array.isArray(stage.milestones) ? stage.milestones : [],
      riskFactors: Array.isArray(stage.riskFactors) ? stage.riskFactors : [],
      qualityStandards: Array.isArray(stage.qualityStandards) ? stage.qualityStandards : []
    }));
  }

  private parseSpecifications(specs: any[]): Specification[] {
    return specs.map((spec, index) => ({
      id: spec.id || uuidv4(),
      category: spec.category || 'architectural',
      title: spec.title || `Specification ${index + 1}`,
      description: spec.description || '',
      technicalRequirements: Array.isArray(spec.technicalRequirements) ? spec.technicalRequirements : [],
      materials: Array.isArray(spec.materials) ? spec.materials : [],
      workmanship: Array.isArray(spec.workmanship) ? spec.workmanship : [],
      testing: Array.isArray(spec.testing) ? spec.testing : [],
      compliance: Array.isArray(spec.compliance) ? spec.compliance : [],
      aiGenerated: true,
      confidence: spec.confidence || 0.8
    }));
  }

  private parseMaterials(materials: any): MaterialList {
    return {
      categories: Array.isArray(materials.categories) ? materials.categories : [],
      totalEstimatedCost: materials.totalEstimatedCost || 0,
      currency: 'GBP',
      lastUpdated: new Date().toISOString(),
      supplierRecommendations: Array.isArray(materials.supplierRecommendations) ? materials.supplierRecommendations : [],
      sustainabilityScore: materials.sustainabilityScore || 0,
      aiGenerated: true
    };
  }

  private parseCostEstimate(estimate: any): CostEstimate {
    return {
      id: uuidv4(),
      projectId: '',
      methodology: estimate.methodology || 'NRM1',
      totalCost: estimate.totalCost || 0,
      currency: 'GBP',
      breakdown: Array.isArray(estimate.breakdown) ? estimate.breakdown : [],
      confidence: estimate.confidence || {
        overall: 0.7,
        dataQuality: 0.7,
        marketStability: 0.8,
        projectComplexity: 0.6,
        timeHorizon: 0.8,
        explanation: 'AI-generated estimate with standard confidence levels',
        factors: []
      },
      marketRates: estimate.marketRates || {
        region: 'UK',
        lastUpdated: new Date().toISOString(),
        source: 'AI-generated',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      version: 1,
      status: 'draft'
    };
  }

  private parseWorkPhases(phases: any[]): WorkPhase[] {
    return phases.map((phase, index) => ({
      id: phase.id || uuidv4(),
      phase: phase.phase || index + 1,
      title: phase.title || `Phase ${index + 1}`,
      description: phase.description || '',
      duration: phase.duration || 7,
      startDate: phase.startDate,
      endDate: phase.endDate,
      dependencies: Array.isArray(phase.dependencies) ? phase.dependencies : [],
      workPackages: Array.isArray(phase.workPackages) ? phase.workPackages : [],
      resources: Array.isArray(phase.resources) ? phase.resources : [],
      risks: Array.isArray(phase.risks) ? phase.risks : [],
      qualityGates: Array.isArray(phase.qualityGates) ? phase.qualityGates : [],
      aiOptimized: true
    }));
  }

  private parseDeliverables(deliverables: any[]): Deliverable[] {
    return deliverables.map((deliverable, index) => ({
      id: deliverable.id || uuidv4(),
      title: deliverable.title || `Deliverable ${index + 1}`,
      description: deliverable.description || '',
      type: deliverable.type || 'documentation',
      ribaStage: deliverable.ribaStage || 2,
      workPhase: deliverable.workPhase || '',
      format: Array.isArray(deliverable.format) ? deliverable.format : ['PDF'],
      recipient: deliverable.recipient || 'Client',
      dueDate: deliverable.dueDate,
      dependencies: Array.isArray(deliverable.dependencies) ? deliverable.dependencies : [],
      acceptanceCriteria: Array.isArray(deliverable.acceptanceCriteria) ? deliverable.acceptanceCriteria : [],
      aiGenerated: true
    }));
  }

  private createDefaultRibaStages(stageNumbers: number[]): RibaStage[] {
    const stageDefinitions = {
      0: { title: 'Strategic Definition', description: 'Identify client requirements and constraints' },
      1: { title: 'Preparation and Briefing', description: 'Develop project brief and feasibility studies' },
      2: { title: 'Concept Design', description: 'Prepare concept design and cost estimates' },
      3: { title: 'Spatial Coordination', description: 'Coordinate design and prepare planning application' },
      4: { title: 'Technical Design', description: 'Develop technical design and specifications' },
      5: { title: 'Manufacturing and Construction', description: 'Construction phase management' },
      6: { title: 'Handover', description: 'Project handover and close out' },
      7: { title: 'Use', description: 'Post-occupancy evaluation' }
    };

    return stageNumbers.map(stageNum => ({
      stage: stageNum,
      title: stageDefinitions[stageNum as keyof typeof stageDefinitions]?.title || `Stage ${stageNum}`,
      description: stageDefinitions[stageNum as keyof typeof stageDefinitions]?.description || '',
      deliverables: [],
      duration: 14,
      dependencies: stageNum > 0 ? [`stage-${stageNum - 1}`] : [],
      workPackages: [],
      milestones: [],
      riskFactors: [],
      qualityStandards: []
    }));
  }

  private createDefaultSpecifications(categories: string[]): Specification[] {
    return categories.map((category, index) => ({
      id: uuidv4(),
      category: category as any,
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Specification`,
      description: `Detailed ${category} requirements and standards`,
      technicalRequirements: [],
      materials: [],
      workmanship: [],
      testing: [],
      compliance: [],
      aiGenerated: true,
      confidence: 0.7
    }));
  }

  private createDefaultMaterialsList(): MaterialList {
    return {
      categories: [],
      totalEstimatedCost: 0,
      currency: 'GBP',
      lastUpdated: new Date().toISOString(),
      supplierRecommendations: [],
      sustainabilityScore: 0,
      aiGenerated: true
    };
  }

  private createDefaultCostEstimate(): CostEstimate {
    return {
      id: uuidv4(),
      projectId: '',
      methodology: 'NRM1',
      totalCost: 0,
      currency: 'GBP',
      breakdown: [],
      confidence: {
        overall: 0.5,
        dataQuality: 0.5,
        marketStability: 0.8,
        projectComplexity: 0.5,
        timeHorizon: 0.8,
        explanation: 'Default estimate with limited data',
        factors: []
      },
      marketRates: {
        region: 'UK',
        lastUpdated: new Date().toISOString(),
        source: 'default',
        rates: [],
        labourRates: [],
        overheadFactors: []
      },
      lastUpdated: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      version: 1,
      status: 'draft'
    };
  }

  private createDefaultWorkPhases(phaseNames: string[]): WorkPhase[] {
    return phaseNames.map((name, index) => ({
      id: uuidv4(),
      phase: index + 1,
      title: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
      description: `${name} phase of construction`,
      duration: 7,
      dependencies: index > 0 ? [phaseNames[index - 1]] : [],
      workPackages: [],
      resources: [],
      risks: [],
      qualityGates: [],
      aiOptimized: false
    }));
  }

  private createDefaultDeliverables(deliverableNames: string[]): Deliverable[] {
    return deliverableNames.map((name, index) => ({
      id: uuidv4(),
      title: name.charAt(0).toUpperCase() + name.slice(1).replace('-', ' '),
      description: `${name} deliverable`,
      type: 'documentation' as any,
      ribaStage: 2,
      workPhase: '',
      format: ['PDF'],
      recipient: 'Client',
      dependencies: [],
      acceptanceCriteria: [],
      aiGenerated: false
    }));
  }

  private async validateGeneratedSoW(sow: ScopeOfWork): Promise<SoWValidationResult> {
    const issues: ValidationIssue[] = [];
    let score = 100;

    // Validate basic structure
    if (sow.ribaStages.length === 0) {
      issues.push({
        severity: 'critical',
        category: 'structure',
        description: 'No RIBA stages defined',
        location: 'ribaStages',
        suggestion: 'Add appropriate RIBA stages for the project type',
        impact: 'Cannot proceed without defined project stages',
        autoFixable: false
      });
      score -= 30;
    }

    if (sow.specifications.length === 0) {
      issues.push({
        severity: 'error',
        category: 'specifications',
        description: 'No technical specifications defined',
        location: 'specifications',
        suggestion: 'Add detailed technical specifications',
        impact: 'Builders cannot provide accurate quotes without specifications',
        autoFixable: false
      });
      score -= 20;
    }

    if (sow.workPhases.length === 0) {
      issues.push({
        severity: 'error',
        category: 'planning',
        description: 'No work phases defined',
        location: 'workPhases',
        suggestion: 'Define construction phases and sequencing',
        impact: 'Project cannot be properly planned and executed',
        autoFixable: false
      });
      score -= 20;
    }

    // Validate cost estimate
    if (sow.costEstimate.totalCost <= 0) {
      issues.push({
        severity: 'warning',
        category: 'cost',
        description: 'No cost estimate provided',
        location: 'costEstimate',
        suggestion: 'Generate cost estimates for all work items',
        impact: 'Client cannot budget effectively',
        autoFixable: true
      });
      score -= 10;
    }

    return {
      validator: 'ai',
      validationType: 'completeness',
      passed: score >= 70,
      score: Math.max(0, score),
      issues,
      recommendations: this.generateValidationRecommendations(issues),
      validatedAt: new Date().toISOString(),
      validatorDetails: 'SoWGenerationService automated validation'
    };
  }

  private generateValidationRecommendations(issues: ValidationIssue[]): string[] {
    const recommendations: string[] = [];

    if (issues.some(i => i.category === 'structure')) {
      recommendations.push('Review and complete the RIBA stage definitions');
    }

    if (issues.some(i => i.category === 'specifications')) {
      recommendations.push('Add detailed technical specifications for all work items');
    }

    if (issues.some(i => i.category === 'cost')) {
      recommendations.push('Generate comprehensive cost estimates');
    }

    if (issues.some(i => i.severity === 'critical')) {
      recommendations.push('Address critical issues before distributing to builders');
    }

    return recommendations;
  }

  private generateRecommendations(sow: ScopeOfWork): string[] {
    const recommendations: string[] = [];

    // Check AI confidence
    if (sow.aiGenerationMetadata.confidence < 0.8) {
      recommendations.push('Consider reviewing and refining the generated content due to lower AI confidence');
    }

    // Check validation results
    const validationSummary = ScopeOfWorkModel.getValidationSummary(sow);
    if (validationSummary.criticalIssues > 0) {
      recommendations.push('Address critical validation issues before proceeding');
    }

    if (validationSummary.warnings > 0) {
      recommendations.push('Review and resolve validation warnings for better quality');
    }

    // Check completeness
    if (sow.materials.categories.length === 0) {
      recommendations.push('Add detailed materials list with specifications and costs');
    }

    if (sow.deliverables.length === 0) {
      recommendations.push('Define project deliverables and acceptance criteria');
    }

    return recommendations;
  }

  private generateNextSteps(sow: ScopeOfWork): string[] {
    const nextSteps: string[] = [];

    if (sow.status === 'generated') {
      nextSteps.push('Review the generated Scope of Work for accuracy and completeness');
      nextSteps.push('Validate compliance with building regulations and industry standards');
      nextSteps.push('Approve the SoW to proceed with builder distribution');
    }

    const validationSummary = ScopeOfWorkModel.getValidationSummary(sow);
    if (!validationSummary.passed) {
      nextSteps.push('Address validation issues before approval');
    }

    if (sow.costEstimate.totalCost === 0) {
      nextSteps.push('Generate detailed cost estimates');
    }

    return nextSteps;
  }

  private validateRequest(request: SoWGenerationRequest): string[] {
    const errors: string[] = [];

    if (!request.projectId) {
      errors.push('Project ID is required');
    }

    if (!request.projectType) {
      errors.push('Project type is required');
    }

    if (!request.requirements) {
      errors.push('Project requirements are required');
    }

    if (!request.preferences) {
      errors.push('Generation preferences are required');
    }

    return errors;
  }

  private async saveScopeOfWork(sow: ScopeOfWork): Promise<void> {
    try {
      const command = new PutCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform',
        Item: sow
      });

      await this.dynamoClient.send(command);
      
      logger.info('ScopeOfWork saved to database', { sowId: sow.id });
    } catch (error) {
      logger.error('Failed to save ScopeOfWork', { 
        sowId: sow.id, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getScopeOfWork(sowId: string): Promise<ScopeOfWork | null> {
    try {
      const command = new GetCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform',
        Key: {
          PK: `SOW#${sowId}`,
          SK: 'METADATA'
        }
      });

      const result = await this.dynamoClient.send(command);
      return result.Item as ScopeOfWork || null;
    } catch (error) {
      logger.error('Failed to get ScopeOfWork', { 
        sowId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async getScopeOfWorksByProject(projectId: string): Promise<ScopeOfWork[]> {
    try {
      const command = new QueryCommand({
        TableName: process.env.DYNAMODB_TABLE_NAME || 'uk-home-improvement-platform',
        IndexName: 'GSI4',
        KeyConditionExpression: 'GSI4PK = :projectId',
        ExpressionAttributeValues: {
          ':projectId': projectId
        },
        ScanIndexForward: false // Get latest versions first
      });

      const result = await this.dynamoClient.send(command);
      return (result.Items as ScopeOfWork[]) || [];
    } catch (error) {
      logger.error('Failed to get ScopeOfWorks by project', { 
        projectId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      throw error;
    }
  }

  async approveScopeOfWork(sowId: string): Promise<ScopeOfWork> {
    const sow = await this.getScopeOfWork(sowId);
    if (!sow) {
      throw new Error('ScopeOfWork not found');
    }

    const approvedSoW = ScopeOfWorkModel.updateStatus(sow, 'approved');
    await this.saveScopeOfWork(approvedSoW);

    return approvedSoW;
  }
}