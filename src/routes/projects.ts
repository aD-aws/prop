import { Router, Response } from 'express';
import { ProjectService } from '../services/ProjectService';
import { CouncilDataService } from '../services/CouncilDataService';
import { ApiResponse, ProjectType, ProjectStatus } from '../types';
import { AuthenticatedRequest } from '../middleware/auth';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';
import { logger } from '../utils/logger';

const router = Router();
const projectService = new ProjectService();
const councilDataService = new CouncilDataService();

// Validation schemas
const createProjectSchema = Joi.object({
  propertyAddress: Joi.object({
    line1: Joi.string().required().trim().min(1),
    line2: Joi.string().optional().allow(''),
    city: Joi.string().required().trim().min(1),
    county: Joi.string().optional().allow(''),
    postcode: Joi.string().required().trim().min(1),
    country: Joi.string().required().trim().min(1)
  }).required(),
  projectType: Joi.string().valid(
    'loft-conversion',
    'rear-extension', 
    'side-extension',
    'bathroom-renovation',
    'kitchen-renovation',
    'conservatory',
    'garage-conversion',
    'basement-conversion',
    'roof-replacement',
    'other'
  ).required(),
  requirements: Joi.object({
    description: Joi.string().optional().allow(''),
    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
      area: Joi.number().positive().optional(),
      unit: Joi.string().valid('meters', 'feet').default('meters')
    }).optional(),
    materials: Joi.object({
      quality: Joi.string().valid('budget', 'standard', 'premium').default('standard'),
      preferences: Joi.array().items(Joi.string()).default([]),
      restrictions: Joi.array().items(Joi.string()).default([])
    }).optional(),
    timeline: Joi.object({
      startDate: Joi.string().isoDate().optional(),
      endDate: Joi.string().isoDate().optional(),
      flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').default('flexible')
    }).optional(),
    budget: Joi.object({
      min: Joi.number().min(0).default(0),
      max: Joi.number().min(0).default(0),
      currency: Joi.string().valid('GBP').default('GBP')
    }).optional(),
    specialRequirements: Joi.array().items(Joi.string()).default([])
  }).optional()
});

const updateProjectSchema = Joi.object({
  requirements: Joi.object({
    description: Joi.string().optional(),
    dimensions: Joi.object({
      length: Joi.number().positive().optional(),
      width: Joi.number().positive().optional(),
      height: Joi.number().positive().optional(),
      area: Joi.number().positive().optional(),
      unit: Joi.string().valid('meters', 'feet').optional()
    }).optional(),
    materials: Joi.object({
      quality: Joi.string().valid('budget', 'standard', 'premium').optional(),
      preferences: Joi.array().items(Joi.string()).optional(),
      restrictions: Joi.array().items(Joi.string()).optional()
    }).optional(),
    timeline: Joi.object({
      startDate: Joi.string().isoDate().optional(),
      endDate: Joi.string().isoDate().optional(),
      flexibility: Joi.string().valid('rigid', 'flexible', 'very-flexible').optional()
    }).optional(),
    budget: Joi.object({
      min: Joi.number().min(0).optional(),
      max: Joi.number().min(0).optional(),
      currency: Joi.string().valid('GBP').optional()
    }).optional(),
    specialRequirements: Joi.array().items(Joi.string()).optional()
  }).optional(),
  status: Joi.string().valid(
    'draft',
    'requirements-gathering',
    'council-check',
    'sow-generation',
    'quote-collection',
    'quote-review',
    'contract-generation',
    'active',
    'completed',
    'cancelled'
  ).optional()
});

// GET /api/projects/types - Get project type information
router.get('/types', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const projectTypes: ProjectType[] = [
      'loft-conversion',
      'rear-extension',
      'side-extension',
      'bathroom-renovation',
      'kitchen-renovation',
      'conservatory',
      'garage-conversion',
      'basement-conversion',
      'roof-replacement',
      'other'
    ];

    const typesInfo = await Promise.all(
      projectTypes.map(async (type) => ({
        type,
        ...await projectService.getProjectTypeInfo(type)
      }))
    );

    res.json({
      success: true,
      data: typesInfo,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting project types:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_TYPES_ERROR',
        message: 'Failed to retrieve project type information'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// GET /api/projects/types/:type - Get specific project type information
router.get('/types/:type', async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    const projectType = req.params.type as ProjectType;
    
    const validTypes: ProjectType[] = [
      'loft-conversion',
      'rear-extension',
      'side-extension',
      'bathroom-renovation',
      'kitchen-renovation',
      'conservatory',
      'garage-conversion',
      'basement-conversion',
      'roof-replacement',
      'other'
    ];

    if (!validTypes.includes(projectType)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PROJECT_TYPE',
          message: 'Invalid project type specified'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const typeInfo = await projectService.getProjectTypeInfo(projectType);

    res.json({
      success: true,
      data: {
        type: projectType,
        ...typeInfo
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting project type info:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_TYPE_INFO_ERROR',
        message: 'Failed to retrieve project type information'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// POST /api/projects - Create new project
router.post('/', 
  authenticateToken, 
  validateRequest({ body: createProjectSchema }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown'
        });
      }

      const project = await projectService.createProject({
        ownerId: req.user.userId,
        propertyAddress: req.body.propertyAddress,
        projectType: req.body.projectType,
        requirements: req.body.requirements
      });

      // Note: Council data check will be handled separately via address validation service
      // This requires converting Address to PostcodeAddress first

      res.status(201).json({
        success: true,
        data: project,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    } catch (error) {
      logger.error('Error creating project:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_CREATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  }
);

// GET /api/projects - Get user's projects
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const status = req.query.status as ProjectStatus;
    let projects;

    if (status) {
      projects = await projectService.getProjectsByStatusAndOwner(status, req.user.userId);
    } else {
      projects = await projectService.getProjectsByOwner(req.user.userId);
    }

    res.json({
      success: true,
      data: projects,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting projects:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECTS_RETRIEVAL_ERROR',
        message: 'Failed to retrieve projects'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// GET /api/projects/dashboard - Get project dashboard
router.get('/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const dashboard = await projectService.getProjectDashboard(req.user.userId);

    res.json({
      success: true,
      data: dashboard,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting project dashboard:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_ERROR',
        message: 'Failed to retrieve project dashboard'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// GET /api/projects/:id - Get specific project
router.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const project = await projectService.getProjectById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PROJECT_NOT_FOUND',
          message: 'Project not found'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    // Check ownership
    if (project.ownerId !== req.user.userId && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    res.json({
      success: true,
      data: project,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting project:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_RETRIEVAL_ERROR',
        message: 'Failed to retrieve project'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// GET /api/projects/:id/progress - Get project progress and next steps
router.get('/:id/progress', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    // Check ownership
    const isOwner = await projectService.validateProjectOwnership(req.params.id, req.user.userId);
    if (!isOwner && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const progress = await projectService.getProjectProgress(req.params.id);

    res.json({
      success: true,
      data: progress,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error getting project progress:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'PROJECT_PROGRESS_ERROR',
        message: 'Failed to retrieve project progress'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', 
  authenticateToken, 
  validateRequest({ body: updateProjectSchema }),
  async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown'
        });
      }

      // Check ownership
      const isOwner = await projectService.validateProjectOwnership(req.params.id, req.user.userId);
      if (!isOwner && req.user.userType !== 'admin') {
        return res.status(403).json({
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Access denied to this project'
          },
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] as string || 'unknown'
        });
      }

      const updatedProject = await projectService.updateProject(req.params.id, req.body);

      res.json({
        success: true,
        data: updatedProject,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    } catch (error) {
      logger.error('Error updating project:', error);
      res.status(400).json({
        success: false,
        error: {
          code: 'PROJECT_UPDATE_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }
  }
);

// PUT /api/projects/:id/status - Update project status
router.put('/:id/status', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const { status } = req.body;
    
    const validStatuses: ProjectStatus[] = [
      'draft',
      'requirements-gathering',
      'council-check',
      'sow-generation',
      'quote-collection',
      'quote-review',
      'contract-generation',
      'active',
      'completed',
      'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: 'Invalid project status'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    // Check ownership
    const isOwner = await projectService.validateProjectOwnership(req.params.id, req.user.userId);
    if (!isOwner && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    const updatedProject = await projectService.updateProjectStatus(req.params.id, status);

    res.json({
      success: true,
      data: updatedProject,
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error updating project status:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'STATUS_UPDATE_ERROR',
        message: error instanceof Error ? error.message : 'Failed to update project status'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response<ApiResponse>) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    // Check ownership
    const isOwner = await projectService.validateProjectOwnership(req.params.id, req.user.userId);
    if (!isOwner && req.user.userType !== 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'Access denied to this project'
        },
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] as string || 'unknown'
      });
    }

    await projectService.deleteProject(req.params.id);

    res.json({
      success: true,
      data: { message: 'Project deleted successfully' },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  } catch (error) {
    logger.error('Error deleting project:', error);
    res.status(400).json({
      success: false,
      error: {
        code: 'PROJECT_DELETION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to delete project'
      },
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] as string || 'unknown'
    });
  }
});

export default router;