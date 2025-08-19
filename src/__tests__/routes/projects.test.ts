import request from 'supertest';
import app from '../../app';
import { ProjectService } from '../../services/ProjectService';
import { CouncilDataService } from '../../services/CouncilDataService';
import { ProjectModel } from '../../models/Project';
import { ProjectType, ProjectStatus, Address } from '../../types';
import jwt from 'jsonwebtoken';

// Mock services
jest.mock('../../services/ProjectService');
jest.mock('../../services/CouncilDataService');
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

const MockedProjectService = ProjectService as jest.MockedClass<typeof ProjectService>;
const MockedCouncilDataService = CouncilDataService as jest.MockedClass<typeof CouncilDataService>;

describe('Projects Routes', () => {
  let mockProjectService: jest.Mocked<ProjectService>;
  let mockCouncilDataService: jest.Mocked<CouncilDataService>;
  let authToken: string;

  const mockUser = {
    userId: 'user123',
    email: 'test@example.com',
    userType: 'homeowner'
  };

  const mockAddress: Address = {
    line1: '123 Test Street',
    city: 'London',
    county: 'Greater London',
    postcode: 'SW1A 1AA',
    country: 'United Kingdom'
  };

  beforeEach(() => {
    mockProjectService = new MockedProjectService() as jest.Mocked<ProjectService>;
    mockCouncilDataService = new MockedCouncilDataService() as jest.Mocked<CouncilDataService>;
    
    MockedProjectService.mockImplementation(() => mockProjectService);
    MockedCouncilDataService.mockImplementation(() => mockCouncilDataService);

    // Create auth token
    authToken = jwt.sign(mockUser, 'test-secret', { expiresIn: '1h' });

    jest.clearAllMocks();
  });

  describe('GET /api/projects/types', () => {
    it('should return all project types information', async () => {
      const response = await request(app)
        .get('/api/projects/types')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.data[0]).toHaveProperty('type');
      expect(response.body.data[0]).toHaveProperty('title');
      expect(response.body.data[0]).toHaveProperty('description');
      expect(response.body.data[0]).toHaveProperty('typicalCost');
      expect(response.body.data[0]).toHaveProperty('timeframe');
      expect(response.body.data[0]).toHaveProperty('planningRequired');
      expect(response.body.data[0]).toHaveProperty('buildingRegsRequired');
      expect(response.body.data[0]).toHaveProperty('keyConsiderations');
    });
  });

  describe('GET /api/projects/types/:type', () => {
    it('should return specific project type information', async () => {
      const response = await request(app)
        .get('/api/projects/types/loft-conversion')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.type).toBe('loft-conversion');
      expect(response.body.data.title).toBe('Loft Conversion');
      expect(response.body.data.planningRequired).toBe(false);
      expect(response.body.data.buildingRegsRequired).toBe(true);
    });

    it('should return 400 for invalid project type', async () => {
      const response = await request(app)
        .get('/api/projects/types/invalid-type')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_PROJECT_TYPE');
    });
  });

  describe('POST /api/projects', () => {
    it('should create a new project successfully', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockProjectService.createProject.mockResolvedValue(mockProject);
      mockCouncilDataService.getCouncilData.mockResolvedValue({
        success: true,
        data: {
          conservationArea: false,
          listedBuilding: false,
          planningRestrictions: [],
          localAuthority: 'Test Council',
          contactDetails: { name: 'Test Contact' },
          lastChecked: new Date().toISOString()
        },
        source: 'api',
        lastUpdated: new Date().toISOString()
      });

      const projectData = {
        propertyAddress: mockAddress,
        projectType: 'loft-conversion',
        requirements: {
          description: 'Test loft conversion',
          budget: { min: 15000, max: 25000, currency: 'GBP' }
        }
      };

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send(projectData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.projectType).toBe('loft-conversion');
      expect(mockProjectService.createProject).toHaveBeenCalledWith({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion',
        requirements: projectData.requirements
      });
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/projects')
        .send({
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should validate request body', async () => {
      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          propertyAddress: {
            line1: '', // Invalid - empty
            city: 'London',
            postcode: 'SW1A 1AA',
            country: 'UK'
          },
          projectType: 'invalid-type' // Invalid project type
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle service errors', async () => {
      mockProjectService.createProject.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_CREATION_ERROR');
    });
  });

  describe('GET /api/projects', () => {
    it('should return user projects', async () => {
      const mockProjects = [
        ProjectModel.create({
          ownerId: 'user123',
          propertyAddress: mockAddress,
          projectType: 'loft-conversion'
        })
      ];

      mockProjectService.getProjectsByOwner.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProjects);
      expect(mockProjectService.getProjectsByOwner).toHaveBeenCalledWith('user123');
    });

    it('should filter by status when provided', async () => {
      const mockProjects = [
        ProjectModel.update(
          ProjectModel.create({
            ownerId: 'user123',
            propertyAddress: mockAddress,
            projectType: 'loft-conversion'
          }),
          { status: 'draft' }
        )
      ];

      mockProjectService.getProjectsByStatusAndOwner.mockResolvedValue(mockProjects);

      const response = await request(app)
        .get('/api/projects?status=draft')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockProjectService.getProjectsByStatusAndOwner).toHaveBeenCalledWith('draft', 'user123');
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get('/api/projects')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/projects/dashboard', () => {
    it('should return project dashboard', async () => {
      const mockDashboard = {
        projects: [
          ProjectModel.create({
            ownerId: 'user123',
            propertyAddress: mockAddress,
            projectType: 'loft-conversion'
          })
        ],
        summary: {
          total: 1,
          active: 0,
          completed: 0,
          draft: 1
        }
      };

      mockProjectService.getProjectDashboard.mockResolvedValue(mockDashboard);

      const response = await request(app)
        .get('/api/projects/dashboard')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockDashboard);
      expect(mockProjectService.getProjectDashboard).toHaveBeenCalledWith('user123');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return specific project', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockProjectService.getProjectById.mockResolvedValue(mockProject);

      const response = await request(app)
        .get(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProject);
    });

    it('should return 404 when project not found', async () => {
      mockProjectService.getProjectById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/projects/nonexistent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_NOT_FOUND');
    });

    it('should return 403 for unauthorized access', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'other-user',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      mockProjectService.getProjectById.mockResolvedValue(mockProject);

      const response = await request(app)
        .get(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('GET /api/projects/:id/progress', () => {
    it('should return project progress', async () => {
      const mockProgress = {
        currentStep: 'Project Setup',
        nextStep: 'Requirements Gathering',
        description: 'Your project has been created',
        actionRequired: 'Complete your project requirements',
        completionPercentage: 10
      };

      mockProjectService.validateProjectOwnership.mockResolvedValue(true);
      mockProjectService.getProjectProgress.mockResolvedValue(mockProgress);

      const response = await request(app)
        .get('/api/projects/project123/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockProgress);
    });

    it('should return 403 for unauthorized access', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(false);

      const response = await request(app)
        .get('/api/projects/project123/progress')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project successfully', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const updatedProject = ProjectModel.update(mockProject, {
        status: 'requirements-gathering'
      });

      mockProjectService.validateProjectOwnership.mockResolvedValue(true);
      mockProjectService.updateProject.mockResolvedValue(updatedProject);

      const updates = {
        status: 'requirements-gathering',
        requirements: {
          description: 'Updated description'
        }
      };

      const response = await request(app)
        .put(`/api/projects/${mockProject.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('requirements-gathering');
      expect(mockProjectService.updateProject).toHaveBeenCalledWith(mockProject.id, updates);
    });

    it('should validate request body', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/projects/project123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'invalid-status'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for unauthorized access', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(false);

      const response = await request(app)
        .put('/api/projects/project123')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'draft' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });
  });

  describe('PUT /api/projects/:id/status', () => {
    it('should update project status', async () => {
      const mockProject = ProjectModel.create({
        ownerId: 'user123',
        propertyAddress: mockAddress,
        projectType: 'loft-conversion'
      });

      const updatedProject = ProjectModel.update(mockProject, {
        status: 'council-check'
      });

      mockProjectService.validateProjectOwnership.mockResolvedValue(true);
      mockProjectService.updateProjectStatus.mockResolvedValue(updatedProject);

      const response = await request(app)
        .put(`/api/projects/${mockProject.id}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'council-check' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('council-check');
      expect(mockProjectService.updateProjectStatus).toHaveBeenCalledWith(mockProject.id, 'council-check');
    });

    it('should validate status value', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(true);

      const response = await request(app)
        .put('/api/projects/project123/status')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_STATUS');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project successfully', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(true);
      mockProjectService.deleteProject.mockResolvedValue();

      const response = await request(app)
        .delete('/api/projects/project123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Project deleted successfully');
      expect(mockProjectService.deleteProject).toHaveBeenCalledWith('project123');
    });

    it('should return 403 for unauthorized access', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/projects/project123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('ACCESS_DENIED');
    });

    it('should handle service errors', async () => {
      mockProjectService.validateProjectOwnership.mockResolvedValue(true);
      mockProjectService.deleteProject.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .delete('/api/projects/project123')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('PROJECT_DELETION_ERROR');
    });
  });
});