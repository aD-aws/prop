import { SoWGenerationService } from '../../services/SoWGenerationService';
import { SoWPromptTemplates } from '../../services/prompts/SoWPromptTemplates';
import { ScopeOfWorkModel } from '../../models/ScopeOfWork';
import { 
  SoWGenerationRequest,
  ProjectType,
  SoWGenerationPreferences,
  ProjectRequirements,
  CouncilData
} from '../../types';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock AWS services
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

// Mock the prompt templates
jest.mock('../../services/prompts/SoWPromptTemplates');


const mockPromptTemplates = SoWPromptTemplates as jest.Mocked<typeof SoWPromptTemplates>;

describe('SoWGenerationService', () => {
  let service: SoWGenerationService;
  let mockBedrockInstance: any;
  let mockDynamoInstance: any;

  const mockRequirements: ProjectRequirements = {
    description: 'Convert loft to bedroom with ensuite',
    dimensions: {
      length: 8,
      width: 4,
      height: 2.5,
      unit: 'meters'
    },
    materials: {
      quality: 'standard',
      preferences: ['sustainable materials'],
      restrictions: []
    },
    timeline: {
      flexibility: 'flexible'
    },
    budget: {
      min: 25000,
      max: 40000,
      currency: 'GBP'
    },
    specialRequirements: ['ensuite bathroom']
  };

  const mockCouncilData: CouncilData = {
    conservationArea: false,
    listedBuilding: false,
    planningRestrictions: [],
    localAuthority: 'Test Council',
    contactDetails: {
      name: 'Test Planning Department'
    },
    lastChecked: new Date().toISOString()
  };

  const mockPreferences: SoWGenerationPreferences = {
    methodology: 'standard',
    ribaStages: [0, 1, 2, 3, 4, 5],
    detailLevel: 'detailed',
    sustainabilityFocus: 'standard',
    qualityLevel: 'standard',
    timelinePreference: 'balanced',
    customRequirements: [],
    excludeItems: []
  };

  beforeEach(() => {
    // Setup mocks
    mockBedrockInstance = {
      send: jest.fn(),
    } as any;

    mockDynamoInstance = {
      send: jest.fn(),
    } as any;

    (BedrockRuntimeClient as any).mockImplementation(() => mockBedrockInstance);
    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDynamoInstance);

    service = new SoWGenerationService();

    // Mock prompt templates
    mockPromptTemplates.getPromptTemplate.mockReturnValue({
      id: 'loft-conversion-v2.1',
      name: 'Loft Conversion SoW Generator',
      projectType: 'loft-conversion',
      version: '2.1',
      template: 'Mock template for {{projectType}}',
      variables: [
        {
          name: 'projectType',
          type: 'string',
          required: true,
          description: 'Type of project'
        }
      ],
      examples: [],
      validationRules: [],
      lastUpdated: new Date().toISOString(),
      performance: {
        averageGenerationTime: 45000,
        successRate: 0.95,
        averageConfidence: 0.88,
        userSatisfaction: 4.6,
        lastEvaluated: new Date().toISOString()
      }
    });

    mockPromptTemplates.validateTemplateVariables.mockReturnValue([]);
    mockPromptTemplates.interpolateTemplate.mockReturnValue('Interpolated template');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateScopeOfWork', () => {
    const validRequest: SoWGenerationRequest = {
      projectId: 'test-project-id',
      projectType: 'loft-conversion',
      requirements: mockRequirements,
      documents: [],
      councilData: mockCouncilData,
      preferences: mockPreferences
    };

    it('should successfully generate a SoW', async () => {
      // Mock successful Bedrock response
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [
                {
                  stage: 0,
                  title: 'Strategic Definition',
                  description: 'Define project requirements',
                  deliverables: ['Project brief'],
                  duration: 7,
                  dependencies: [],
                  workPackages: [],
                  milestones: [],
                  riskFactors: [],
                  qualityStandards: []
                }
              ],
              specifications: [
                {
                  category: 'structural',
                  title: 'Structural Requirements',
                  description: 'Structural specifications',
                  technicalRequirements: [],
                  materials: [],
                  workmanship: [],
                  testing: [],
                  compliance: []
                }
              ],
              materials: {
                categories: [
                  {
                    category: 'Structural',
                    items: [
                      {
                        name: 'Steel beam',
                        specification: '203x133x25 UC',
                        quantity: 2,
                        unit: 'no',
                        unitCost: 150,
                        totalCost: 300,
                        supplier: 'British Steel'
                      }
                    ],
                    subtotal: 300
                  }
                ],
                totalEstimatedCost: 25000
              },
              workPhases: [
                {
                  phase: 1,
                  title: 'Preparation',
                  description: 'Site preparation',
                  duration: 3,
                  dependencies: [],
                  workPackages: [],
                  resources: [
                    {
                      type: 'labour',
                      resource: 'General labourer',
                      quantity: 2,
                      unit: 'person',
                      cost: 600,
                      critical: false,
                      alternatives: []
                    }
                  ],
                  risks: [],
                  qualityGates: []
                }
              ],
              deliverables: [
                {
                  title: 'Structural Calculations',
                  description: 'Detailed calculations',
                  type: 'calculation',
                  ribaStage: 4,
                  workPhase: 'design',
                  format: ['PDF'],
                  recipient: 'Building Control',
                  dependencies: [],
                  acceptanceCriteria: []
                }
              ],
              costEstimate: {
                totalCost: 32000,
                methodology: 'NRM1',
                breakdown: []
              }
            })
          }],
          usage: {
            input_tokens: 1500,
            output_tokens: 2000
          }
        }))
      };

      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);
      mockDynamoInstance.send.mockResolvedValueOnce({});

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(true);
      expect(result.sowId).toBeDefined();
      expect(result.sow).toBeDefined();
      expect(result.sow!.ribaStages).toHaveLength(1);
      expect(result.sow!.specifications).toHaveLength(1);
      expect(result.sow!.workPhases).toHaveLength(1);
      expect(result.sow!.deliverables).toHaveLength(1);
      expect(result.estimatedCost).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);

      // Verify Bedrock was called
      expect(mockBedrockInstance.send).toHaveBeenCalledTimes(1);
      
      // Verify DynamoDB save was called
      expect(mockDynamoInstance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: expect.any(String),
            Item: expect.objectContaining({
              PK: expect.stringMatching(/^SOW#/),
              SK: 'METADATA',
              projectId: validRequest.projectId,
              status: 'generated'
            })
          })
        })
      );
    });

    it('should handle validation errors', async () => {
      const invalidRequest = {
        ...validRequest,
        projectId: '', // Invalid project ID
        projectType: '' as ProjectType // Invalid project type
      };

      const result = await service.generateScopeOfWork(invalidRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Project ID is required');
      expect(result.errors).toContain('Project type is required');
      expect(mockBedrockInstance.send).not.toHaveBeenCalled();
    });

    it('should handle template validation errors', async () => {
      mockPromptTemplates.validateTemplateVariables.mockReturnValue([
        'Required variable missing'
      ]);

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Required variable missing');
      expect(mockBedrockInstance.send).not.toHaveBeenCalled();
    });

    it('should handle Bedrock API errors', async () => {
      mockBedrockInstance.send.mockRejectedValueOnce(new Error('Bedrock service unavailable'));

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Bedrock service unavailable');
      expect(result.confidence).toBe(0);
    });

    it('should handle invalid JSON response from Bedrock', async () => {
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: 'Invalid JSON response'
          }]
        }))
      };

      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);
      mockDynamoInstance.send.mockResolvedValueOnce({});

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(true); // Should fallback to text parsing
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence for text parsing
      expect(result.warnings).toContain('AI response was parsed as text due to JSON parsing failure');
    });

    it('should generate appropriate validation results', async () => {
      // Mock Bedrock response with minimal data to trigger validation issues
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [], // Empty - should trigger validation error
              specifications: [],
              materials: { categories: [], totalEstimatedCost: 0 },
              workPhases: [],
              deliverables: [],
              costEstimate: { totalCost: 0, methodology: 'NRM1', breakdown: [] }
            })
          }],
          usage: { input_tokens: 1000, output_tokens: 500 }
        }))
      };

      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);
      mockDynamoInstance.send.mockResolvedValueOnce({});

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(true);
      expect(result.sow!.validationResults).toHaveLength(1);
      expect(result.sow!.validationResults[0].passed).toBe(false);
      expect(result.sow!.validationResults[0].issues.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle different project types', async () => {
      const bathroomRequest = {
        ...validRequest,
        projectType: 'bathroom-renovation' as ProjectType
      };

      mockPromptTemplates.getPromptTemplate.mockReturnValue({
        id: 'bathroom-renovation-v1.8',
        name: 'Bathroom Renovation SoW Generator',
        projectType: 'bathroom-renovation',
        version: '1.8',
        template: 'Bathroom template for {{projectType}}',
        variables: [],
        examples: [],
        validationRules: [],
        lastUpdated: new Date().toISOString(),
        performance: {
          averageGenerationTime: 35000,
          successRate: 0.94,
          averageConfidence: 0.90,
          userSatisfaction: 4.7,
          lastEvaluated: new Date().toISOString()
        }
      });

      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [
                {
                  stage: 2,
                  title: 'Concept Design',
                  description: 'Bathroom design concepts',
                  deliverables: [],
                  duration: 7,
                  dependencies: [],
                  workPackages: [],
                  milestones: [],
                  riskFactors: [],
                  qualityStandards: []
                }
              ],
              specifications: [],
              materials: { categories: [], totalEstimatedCost: 8000 },
              workPhases: [],
              deliverables: [],
              costEstimate: { totalCost: 12000, methodology: 'NRM1', breakdown: [] }
            })
          }],
          usage: { input_tokens: 1200, output_tokens: 1500 }
        }))
      };

      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);
      mockDynamoInstance.send.mockResolvedValueOnce({});

      const result = await service.generateScopeOfWork(bathroomRequest);

      expect(result.success).toBe(true);
      expect(mockPromptTemplates.getPromptTemplate).toHaveBeenCalledWith('bathroom-renovation');
    });
  });

  describe('getScopeOfWork', () => {
    it('should retrieve a SoW by ID', async () => {
      const mockSoW = {
        PK: 'SOW#test-id',
        SK: 'METADATA',
        id: 'test-id',
        projectId: 'project-id',
        status: 'generated'
      };

      mockDynamoInstance.send.mockResolvedValueOnce({ Item: mockSoW });

      const result = await service.getScopeOfWork('test-id');

      expect(result).toEqual(mockSoW);
      expect(mockDynamoInstance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Key: {
              PK: 'SOW#test-id',
              SK: 'METADATA'
            }
          })
        })
      );
    });

    it('should return null for non-existent SoW', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Item: null });

      const result = await service.getScopeOfWork('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      mockDynamoInstance.send.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(service.getScopeOfWork('test-id')).rejects.toThrow('DynamoDB error');
    });
  });

  describe('getScopeOfWorksByProject', () => {
    it('should retrieve all SoWs for a project', async () => {
      const mockSoWs = [
        { id: 'sow-1', projectId: 'project-id', version: 1 },
        { id: 'sow-2', projectId: 'project-id', version: 2 }
      ];

      mockDynamoInstance.send.mockResolvedValueOnce({ Items: mockSoWs });

      const result = await service.getScopeOfWorksByProject('project-id');

      expect(result).toEqual(mockSoWs);
      expect(mockDynamoInstance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            IndexName: 'GSI4',
            KeyConditionExpression: 'GSI4PK = :projectId',
            ExpressionAttributeValues: {
              ':projectId': 'project-id'
            }
          })
        })
      );
    });

    it('should return empty array for project with no SoWs', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Items: [] });

      const result = await service.getScopeOfWorksByProject('project-id');

      expect(result).toEqual([]);
    });
  });

  describe('approveScopeOfWork', () => {
    it('should approve a SoW', async () => {
      const mockSoW = {
        PK: 'SOW#test-id',
        SK: 'METADATA',
        id: 'test-id',
        status: 'generated',
        version: 1
      };

      mockDynamoInstance.send
        .mockResolvedValueOnce({ Item: mockSoW }) // Get SoW
        .mockResolvedValueOnce({}); // Save approved SoW

      const result = await service.approveScopeOfWork('test-id');

      expect(result.status).toBe('approved');
      expect(result.approvedAt).toBeDefined();
      expect(mockDynamoInstance.send).toHaveBeenCalledTimes(2);
    });

    it('should throw error for non-existent SoW', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Item: null });

      await expect(service.approveScopeOfWork('non-existent-id'))
        .rejects.toThrow('ScopeOfWork not found');
    });
  });

  describe('validation and recommendations', () => {
    it('should generate appropriate recommendations based on AI confidence', async () => {
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [{ stage: 0, title: 'Test', description: '', deliverables: [], duration: 7, dependencies: [], workPackages: [], milestones: [], riskFactors: [], qualityStandards: [] }],
              specifications: [{ category: 'structural', title: 'Test', description: '', technicalRequirements: [], materials: [], workmanship: [], testing: [], compliance: [] }],
              materials: { categories: [], totalEstimatedCost: 1000 },
              workPhases: [{ phase: 1, title: 'Test', description: '', duration: 7, dependencies: [], workPackages: [], resources: [{ type: 'labour', resource: 'test', quantity: 1, unit: 'person', cost: 100, critical: false, alternatives: [] }], risks: [], qualityGates: [] }],
              deliverables: [],
              costEstimate: { totalCost: 1000, methodology: 'NRM1', breakdown: [] }
            })
          }],
          usage: { input_tokens: 1000, output_tokens: 500 }
        }))
      };

      // Mock low confidence response
      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);
      mockDynamoInstance.send.mockResolvedValueOnce({});

      const validRequest: SoWGenerationRequest = {
        projectId: 'test-project-id',
        projectType: 'loft-conversion',
        requirements: mockRequirements,
        documents: [],
        councilData: mockCouncilData,
        preferences: mockPreferences
      };

      const result = await service.generateScopeOfWork(validRequest);

      expect(result.success).toBe(true);
      expect(result.recommendations).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      expect(result.nextSteps).toContain('Review the generated Scope of Work for accuracy and completeness');
    });
  });
});