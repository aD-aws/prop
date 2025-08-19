import { ProjectService } from '../../services/ProjectService';
import { ProjectModel } from '../../models/Project';
import { dynamoDBDocClient } from '../../config/aws';
import { ProjectType, ProjectStatus, Address, ProjectRequirements, CouncilData, Document } from '../../types';

// Mock AWS SDK
jest.mock('../../config/aws', () => ({
  dynamoDBDocClient: {
    send: jest.fn().mockResolvedValue({})
  },
  TABLE_NAME: 'test-table'
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('ProjectService', () => {
  let projectService: ProjectService;
  const mockSend = dynamoDBDocClient.send as jest.MockedFunction<any>;

  const mockAddress: Address = {
    line1: '123 Test Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom'
  };

  const mockRequirements: ProjectRequirements = {
    description: 'Test project description',
    dimensions: {
      length: 5,
      width: 4,
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
      min: 10000,
      max: 20000,
      currency: 'GBP' as const
    },
    specialRequirements: []
  };

  beforeEach(() => {
    projectService = new ProjectService();
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a new project successfully', async () => {
      mockSend.mockResolvedValueOnce({});

      const projectData = {
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion' as ProjectType,
        requirements: mockRequirements
      };

      const result = await projectService.createProject(projectData);

      expect(result.ownerId).toBe('user123');
      expect(result.projectType).toBe('loft-conversion');
      expect(result.status).toBe('draft');
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Item: expect.objectContaining({
              ownerId: 'user123',
              projectType: 'loft-conversion'
            }),
            ConditionExpression: 'attribute_not_exists(PK)'
          })
        })
      );
    });

    it('should throw error for invalid address', async () => {
      const invalidAddress = {
        ...mockAddress,
        postcode: 'INVALID'
      };

      const projectData = {
        ownerId: 'user123',
        propertyAddress: invalidAddress,
        projectType: 'loft-conversion' as ProjectType
      };

      await expect(projectService.createProject(projectData))
        .rejects.toThrow('Address validation failed');
    });

    it('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      const projectData = {
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion' as ProjectType
      };

      await expect(projectService.createProject(projectData))
        .rejects.toThrow('DynamoDB error');
    });
  });

  describe('getProjectById', () => {
    it('should return project when found', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend.mockResolvedValueOnce({
        Item: mockProject
      });

      const result = await projectService.getProjectById('project123');

      expect(result).toEqual(mockProject);
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            TableName: 'test-table',
            Key: {
              PK: 'PROJECT#project123',
              SK: 'METADATA'
            }
          })
        })
      );
    });

    it('should return null when project not found', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await projectService.getProjectById('nonexistent');

      expect(result).toBeNull();
    });

    it('should handle DynamoDB errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      await expect(projectService.getProjectById('project123'))
        .rejects.toThrow('DynamoDB error');
    });
  });

  describe('getProjectsByOwner', () => {
    it('should return projects for owner', async () => {
      const mockProjects = [
        ProjectModel.create({
          ownerId: 'user123',
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        }),
        ProjectModel.create({
          ownerId: 'user123',
          propertyAddress: mockAddress,
          projectType: 'bathroom-renovation'
        })
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects
      });

      const result = await projectService.getProjectsByOwner('user123');

      expect(result).toEqual(mockProjects);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should return empty array when no projects found', async () => {
      mockSend.mockResolvedValueOnce({});

      const result = await projectService.getProjectsByOwner('user123');

      expect(result).toEqual([]);
    });
  });

  describe('getProjectsByStatus', () => {
    it('should return projects by status', async () => {
      const mockProjects = [
        ProjectModel.create({
          ownerId: 'user123',
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        })
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects
      });

      const result = await projectService.getProjectsByStatus('draft');

      expect(result).toEqual(mockProjects);
      expect(mockSend).toHaveBeenCalled();
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const updates = {
        status: 'requirements-gathering' as ProjectStatus,
        requirements: mockRequirements
      };

      mockSend
        .mockResolvedValueOnce({ Item: existingProject }) // getProjectById
        .mockResolvedValueOnce({}); // updateProject

      const result = await projectService.updateProject('project123', updates);

      expect(result.status).toBe('requirements-gathering');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should throw error when project not found', async () => {
      mockSend.mockResolvedValueOnce({}); // getProjectById returns null

      await expect(projectService.updateProject('nonexistent', {}))
        .rejects.toThrow('Project not found');
    });

    it('should validate requirements when updating', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const invalidRequirements = {
        description: '', // Invalid - empty description
        budget: { min: -1000, max: 5000, currency: 'GBP' as const }
      };

      mockSend.mockResolvedValueOnce({ Item: existingProject });

      await expect(projectService.updateProject('project123', {
        requirements: invalidRequirements
      })).rejects.toThrow('Requirements validation failed');
    });
  });

  describe('updateProjectStatus', () => {
    it('should update project status', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend
        .mockResolvedValueOnce({ Item: existingProject })
        .mockResolvedValueOnce({});

      const result = await projectService.updateProjectStatus('project123', 'council-check');

      expect(result.status).toBe('council-check');
    });
  });

  describe('addDocument', () => {
    it('should add document to project', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const document: Document = {
        id: 'doc123',
        filename: 'test.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        s3Key: 'documents/doc123.pdf',
        uploadedAt: new Date().toISOString()
      };

      mockSend
        .mockResolvedValueOnce({ Item: existingProject })
        .mockResolvedValueOnce({});

      const result = await projectService.addDocument('project123', document);

      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]).toEqual(document);
    });

    it('should throw error when project not found', async () => {
      mockSend.mockResolvedValueOnce({});

      const document: Document = {
        id: 'doc123',
        filename: 'test.pdf',
        originalName: 'test-document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        s3Key: 'documents/doc123.pdf',
        uploadedAt: new Date().toISOString()
      };

      await expect(projectService.addDocument('nonexistent', document))
        .rejects.toThrow('Project not found');
    });
  });

  describe('updateCouncilData', () => {
    it('should update council data', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const councilData: CouncilData = {
        conservationArea: true,
        listedBuilding: false,
        planningRestrictions: ['Conservation area consent required'],
        localAuthority: 'Westminster City Council',
        contactDetails: {
          name: 'Planning Department'
        },
        lastChecked: new Date().toISOString()
      };

      mockSend
        .mockResolvedValueOnce({ Item: existingProject })
        .mockResolvedValueOnce({});

      const result = await projectService.updateCouncilData('project123', councilData);

      expect(result.councilData).toEqual(councilData);
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const existingProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend
        .mockResolvedValueOnce({ Item: existingProject })
        .mockResolvedValueOnce({});

      await projectService.deleteProject('project123');

      expect(mockSend).toHaveBeenCalledTimes(2); // getProjectById + deleteProject
    });

    it('should throw error when project not found', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(projectService.deleteProject('nonexistent'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('getProjectTypeInfo', () => {
    it('should return project type information', async () => {
      const info = await projectService.getProjectTypeInfo('loft-conversion');

      expect(info.title).toBe('Loft Conversion');
      expect(info.description).toContain('Convert your unused loft space');
      expect(info.planningRequired).toBe(false);
      expect(info.buildingRegsRequired).toBe(true);
    });
  });

  describe('getProjectProgress', () => {
    it('should return project progress information', async () => {
      const project = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend.mockResolvedValueOnce({ Item: project });

      const progress = await projectService.getProjectProgress('project123');

      expect(progress.currentStep).toBe('Project Setup');
      expect(progress.nextStep).toBe('Requirements Gathering');
      expect(progress.completionPercentage).toBe(10);
    });

    it('should throw error when project not found', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(projectService.getProjectProgress('nonexistent'))
        .rejects.toThrow('Project not found');
    });
  });

  describe('getProjectDashboard', () => {
    it('should return project dashboard with summary', async () => {
      const mockProjects = [
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user123',
            propertyAddress: mockAddress,
            projectType: 'loft-conversion'
          }),
          { status: 'draft' }
        ),
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user123',
            propertyAddress: mockAddress,
            projectType: 'bathroom-renovation'
          }),
          { status: 'active' }
        ),
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user123',
            propertyAddress: mockAddress,
            projectType: 'kitchen-renovation'
          }),
          { status: 'completed' }
        )
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects
      });

      const dashboard = await projectService.getProjectDashboard('user123');

      expect(dashboard.projects).toHaveLength(3);
      expect(dashboard.summary.total).toBe(3);
      expect(dashboard.summary.active).toBe(1);
      expect(dashboard.summary.completed).toBe(1);
      expect(dashboard.summary.draft).toBe(1);
    });
  });

  describe('validateProjectOwnership', () => {
    it('should return true for valid ownership', async () => {
      const project = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend.mockResolvedValueOnce({ Item: project });

      const isOwner = await projectService.validateProjectOwnership('project123', 'user123');

      expect(isOwner).toBe(true);
    });

    it('should return false for invalid ownership', async () => {
      const project = ProjectModel.create({
        ownerId: 'user456',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockSend.mockResolvedValueOnce({ Item: project });

      const isOwner = await projectService.validateProjectOwnership('project123', 'user123');

      expect(isOwner).toBe(false);
    });

    it('should return false when project not found', async () => {
      mockSend.mockResolvedValueOnce({});

      const isOwner = await projectService.validateProjectOwnership('nonexistent', 'user123');

      expect(isOwner).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockSend.mockRejectedValueOnce(new Error('DynamoDB error'));

      const isOwner = await projectService.validateProjectOwnership('project123', 'user123');

      expect(isOwner).toBe(false);
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      const mockProjects = [
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user1',
            propertyAddress: mockAddress,
            projectType: 'loft-conversion'
          }),
          { status: 'draft' }
        ),
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user2',
            propertyAddress: mockAddress,
            projectType: 'loft-conversion'
          }),
          { status: 'completed' }
        ),
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user3',
            propertyAddress: mockAddress,
            projectType: 'bathroom-renovation'
          }),
          { status: 'active' }
        )
      ];

      mockSend.mockResolvedValueOnce({
        Items: mockProjects
      });

      const stats = await projectService.getProjectStatistics();

      expect(stats.totalProjects).toBe(3);
      expect(stats.projectsByStatus.draft).toBe(1);
      expect(stats.projectsByStatus.completed).toBe(1);
      expect(stats.projectsByStatus.active).toBe(1);
      expect(stats.projectsByType['loft-conversion']).toBe(2);
      expect(stats.projectsByType['bathroom-renovation']).toBe(1);
      expect(typeof stats.averageCompletionTime).toBe('number');
    });
  });
});