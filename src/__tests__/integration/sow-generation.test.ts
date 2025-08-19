import request from 'supertest';
import app from '../../app';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { 
  User, 
  Project, 
  SoWGenerationRequest,
  ProjectType,
  SoWGenerationPreferences 
} from '../../types';
import { UserModel } from '../../models/User';
import { ProjectModel } from '../../models/Project';
import jwt from 'jsonwebtoken';

// Mock AWS services
jest.mock('@aws-sdk/client-bedrock-runtime');
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb');

describe('SoW Generation Integration Tests', () => {
  let authToken: string;
  let testUser: User;
  let testProject: Project;
  let mockDynamoInstance: any;
  let mockBedrockInstance: any;

  beforeAll(async () => {
    // Setup mocks
    mockDynamoInstance = {
      send: jest.fn(),
    } as any;

    mockBedrockInstance = {
      send: jest.fn(),
    } as any;

    (DynamoDBDocumentClient.from as jest.Mock).mockReturnValue(mockDynamoInstance);
    (BedrockRuntimeClient as any).mockImplementation(() => mockBedrockInstance);

    // Create test user
    testUser = UserModel.create({
      email: 'test@example.com',
      userType: 'homeowner',
      profile: {
        firstName: 'Test',
        lastName: 'User'
      },
      gdprConsent: true
    });

    // Create test project
    testProject = ProjectModel.create({
      ownerId: testUser.id,
      propertyAddress: {
        line1: '123 Test Street',
        city: 'London',
        county: 'Greater London',
        postcode: 'SW1A 1AA',
        country: 'UK'
      },
      projectType: 'loft-conversion',
      requirements: {
        description: 'Convert loft to bedroom with ensuite bathroom',
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
        specialRequirements: ['ensuite bathroom', 'dormer window']
      }
    });

    // Generate auth token
    authToken = jwt.sign(
      { 
        userId: testUser.id, 
        email: testUser.email, 
        userType: testUser.userType 
      },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Mock DynamoDB responses
    mockDynamoInstance.send.mockImplementation((command) => {
      if (command instanceof PutCommand) {
        return Promise.resolve({});
      }
      return Promise.resolve({ Item: null });
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/sow/generate', () => {
    const validGenerationRequest: Omit<SoWGenerationRequest, 'documents' | 'councilData'> & {
      documents: any[];
      councilData: any;
    } = {
      projectId: testProject.id,
      projectType: 'loft-conversion' as ProjectType,
      requirements: testProject.requirements,
      documents: [],
      councilData: {
        conservationArea: false,
        listedBuilding: false,
        planningRestrictions: [],
        localAuthority: 'Westminster City Council',
        contactDetails: {
          name: 'Westminster Planning',
          phone: '020 7641 6500',
          email: 'planning@westminster.gov.uk'
        },
        lastChecked: new Date().toISOString()
      },
      preferences: {
        methodology: 'standard',
        ribaStages: [0, 1, 2, 3, 4, 5],
        detailLevel: 'detailed',
        sustainabilityFocus: 'standard',
        qualityLevel: 'standard',
        timelinePreference: 'balanced',
        customRequirements: [],
        excludeItems: []
      } as SoWGenerationPreferences
    };

    it('should successfully generate a SoW for loft conversion', async () => {
      // Mock successful Bedrock response
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [
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
              ],
              specifications: [
                {
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
                  compliance: []
                }
              ],
              materials: {
                categories: [
                  {
                    category: 'Structural',
                    items: [
                      {
                        name: 'Steel I-beam',
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
                totalEstimatedCost: 25000,
                supplierRecommendations: []
              },
              workPhases: [
                {
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
                  qualityGates: []
                }
              ],
              deliverables: [
                {
                  title: 'Structural Calculations',
                  description: 'Detailed structural calculations for beam sizing',
                  type: 'calculation',
                  ribaStage: 4,
                  workPhase: 'design',
                  format: ['PDF'],
                  recipient: 'Building Control',
                  dependencies: [],
                  acceptanceCriteria: ['Approved by structural engineer']
                }
              ],
              costEstimate: {
                totalCost: 32000,
                methodology: 'NRM1',
                breakdown: [
                  {
                    category: 'building-works',
                    description: 'Main construction works',
                    quantity: 1,
                    unit: 'item',
                    unitRate: 25000,
                    totalCost: 25000
                  }
                ]
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

      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerationRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sowId).toBeDefined();
      expect(response.body.data.sow).toBeDefined();
      expect(response.body.data.sow.ribaStages).toHaveLength(2);
      expect(response.body.data.sow.specifications).toHaveLength(1);
      expect(response.body.data.sow.workPhases).toHaveLength(1);
      expect(response.body.data.sow.deliverables).toHaveLength(1);
      expect(response.body.data.estimatedCost).toBeGreaterThan(0);
      expect(response.body.data.confidence).toBeGreaterThan(0);

      // Verify DynamoDB save was called
      expect(mockDynamoInstance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: expect.any(String),
            Item: expect.objectContaining({
              PK: expect.stringMatching(/^SOW#/),
              SK: 'METADATA',
              projectId: testProject.id,
              status: 'generated'
            })
          })
        })
      );
    });

    it('should handle different project types correctly', async () => {
      const bathroomRequest = {
        ...validGenerationRequest,
        projectType: 'bathroom-renovation' as ProjectType,
        requirements: {
          ...validGenerationRequest.requirements,
          description: 'Complete bathroom renovation with new fixtures'
        }
      };

      // Mock Bedrock response for bathroom renovation
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [
                {
                  stage: 2,
                  title: 'Concept Design',
                  description: 'Bathroom layout and fixture selection',
                  deliverables: ['Layout drawings', 'Fixture schedule'],
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
                  category: 'plumbing',
                  title: 'Plumbing Requirements',
                  description: 'Water supply and drainage requirements',
                  technicalRequirements: [],
                  materials: [],
                  workmanship: [],
                  testing: [],
                  compliance: []
                }
              ],
              materials: {
                categories: [],
                totalEstimatedCost: 8000
              },
              workPhases: [
                {
                  phase: 1,
                  title: 'Strip Out',
                  description: 'Remove existing bathroom fixtures',
                  duration: 2,
                  dependencies: [],
                  workPackages: [],
                  resources: [],
                  risks: [],
                  qualityGates: []
                }
              ],
              deliverables: [],
              costEstimate: {
                totalCost: 12000,
                methodology: 'NRM1',
                breakdown: []
              }
            })
          }],
          usage: { input_tokens: 1200, output_tokens: 1500 }
        }))
      };

      mockBedrockInstance.send.mockResolvedValueOnce(mockBedrockResponse);

      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(bathroomRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sow.specifications[0].category).toBe('plumbing');
      expect(response.body.data.sow.workPhases[0].title).toBe('Strip Out');
    });

    it('should validate required fields', async () => {
      const invalidRequest = {
        ...validGenerationRequest,
        projectId: '', // Invalid project ID
        projectType: 'invalid-type' // Invalid project type
      };

      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(2);
    });

    it('should handle AI generation failures gracefully', async () => {
      // Mock Bedrock failure
      mockBedrockInstance.send.mockRejectedValueOnce(new Error('Bedrock service unavailable'));

      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerationRequest)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('GENERATION_FAILED');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/sow/generate')
        .send(validGenerationRequest)
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should include validation results in generated SoW', async () => {
      // Mock successful Bedrock response with minimal data to trigger validation warnings
      const mockBedrockResponse = {
        body: new TextEncoder().encode(JSON.stringify({
          content: [{
            text: JSON.stringify({
              ribaStages: [],
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

      const response = await request(app)
        .post('/api/sow/generate')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validGenerationRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.warnings).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
      expect(response.body.data.nextSteps).toBeDefined();
    });
  });

  describe('GET /api/sow/:sowId', () => {
    it('should retrieve a SoW by ID', async () => {
      const mockSoW = {
        PK: 'SOW#test-sow-id',
        SK: 'METADATA',
        id: 'test-sow-id',
        projectId: testProject.id,
        version: 1,
        status: 'generated',
        ribaStages: [],
        specifications: [],
        materials: { categories: [], totalEstimatedCost: 0 },
        workPhases: [],
        deliverables: [],
        generatedAt: new Date().toISOString(),
        aiGenerationMetadata: {
          model: 'claude-3-5-sonnet',
          confidence: 0.85,
          generationTime: 30000
        },
        validationResults: []
      };

      mockDynamoInstance.send.mockResolvedValueOnce({ Item: mockSoW });

      const response = await request(app)
        .get('/api/sow/test-sow-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sow.id).toBe('test-sow-id');
      expect(response.body.data.sow.GSI4PK).toBeUndefined();
      expect(response.body.data.sow.GSI4SK).toBeUndefined();
    });

    it('should return 404 for non-existent SoW', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Item: null });

      const response = await request(app)
        .get('/api/sow/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SOW_NOT_FOUND');
    });

    it('should validate SoW ID format', async () => {
      const response = await request(app)
        .get('/api/sow/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/sow/project/:projectId', () => {
    it('should retrieve all SoWs for a project', async () => {
      const mockSoWs = [
        {
          PK: 'SOW#sow-1',
          SK: 'METADATA',
          id: 'sow-1',
          projectId: testProject.id,
          version: 1,
          status: 'generated'
        },
        {
          PK: 'SOW#sow-2',
          SK: 'METADATA',
          id: 'sow-2',
          projectId: testProject.id,
          version: 2,
          status: 'approved'
        }
      ];

      mockDynamoInstance.send.mockResolvedValueOnce({ Items: mockSoWs });

      const response = await request(app)
        .get(`/api/sow/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sows).toHaveLength(2);
      expect(response.body.data.count).toBe(2);
      expect(response.body.data.sows[0].GSI4PK).toBeUndefined();
    });

    it('should return empty array for project with no SoWs', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Items: [] });

      const response = await request(app)
        .get(`/api/sow/project/${testProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.sows).toHaveLength(0);
      expect(response.body.data.count).toBe(0);
    });
  });

  describe('PUT /api/sow/:sowId/approve', () => {
    it('should approve a SoW', async () => {
      const mockSoW = {
        PK: 'SOW#test-sow-id',
        SK: 'METADATA',
        id: 'test-sow-id',
        projectId: testProject.id,
        status: 'generated',
        version: 1
      };

      const mockApprovedSoW = {
        ...mockSoW,
        status: 'approved',
        approvedAt: new Date().toISOString()
      };

      // Mock get and save operations
      mockDynamoInstance.send
        .mockResolvedValueOnce({ Item: mockSoW }) // Get SoW
        .mockResolvedValueOnce({}); // Save approved SoW

      const response = await request(app)
        .put('/api/sow/test-sow-id/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('approved successfully');

      // Verify save was called with approved status
      expect(mockDynamoInstance.send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Item: expect.objectContaining({
              status: 'approved',
              approvedAt: expect.any(String)
            })
          })
        })
      );
    });

    it('should return 404 for non-existent SoW', async () => {
      mockDynamoInstance.send.mockResolvedValueOnce({ Item: null });

      const response = await request(app)
        .put('/api/sow/non-existent-id/approve')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('SOW_NOT_FOUND');
    });
  });

  describe('GET /api/sow/:sowId/validation', () => {
    it('should return validation summary for a SoW', async () => {
      const mockSoW = {
        PK: 'SOW#test-sow-id',
        SK: 'METADATA',
        id: 'test-sow-id',
        validationResults: [
          {
            validator: 'ai',
            validationType: 'completeness',
            passed: true,
            score: 85,
            issues: [],
            recommendations: ['Add more detailed specifications'],
            validatedAt: new Date().toISOString()
          }
        ]
      };

      mockDynamoInstance.send.mockResolvedValueOnce({ Item: mockSoW });

      const response = await request(app)
        .get('/api/sow/test-sow-id/validation')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.validationSummary).toBeDefined();
      expect(response.body.data.validationResults).toHaveLength(1);
      expect(response.body.data.validationSummary.overallScore).toBe(85);
    });
  });
});