import { 
  GetCommand, 
  PutCommand, 
  UpdateCommand, 
  DeleteCommand, 
  QueryCommand,
  ScanCommand 
} from '@aws-sdk/lib-dynamodb';
import { dynamoDBDocClient, TABLE_NAME } from '../config/aws';
import { 
  Project, 
  ProjectType, 
  ProjectStatus, 
  ProjectRequirements, 
  Address, 
  CouncilData,
  Document
} from '../types';
import { ProjectModel } from '../models/Project';
import { logger } from '../utils/logger';

export class ProjectService {
  async createProject(projectData: {
    ownerId: string;
    propertyAddress: Address;
    projectType: ProjectType;
    requirements?: Partial<ProjectRequirements>;
  }): Promise<Project> {
    try {
      // Validate address
      const addressErrors = ProjectModel.validateAddress(projectData.propertyAddress);
      if (addressErrors.length > 0) {
        throw new Error(`Address validation failed: ${addressErrors.join(', ')}`);
      }

      const project = ProjectModel.create(projectData);

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: project,
        ConditionExpression: 'attribute_not_exists(PK)',
      });

      await dynamoDBDocClient.send(command);

      logger.info('Project created successfully', { 
        projectId: project.id, 
        ownerId: project.ownerId,
        projectType: project.projectType 
      });
      
      return project;
    } catch (error) {
      logger.error('Error creating project:', error);
      throw error;
    }
  }

  async getProjectById(projectId: string): Promise<Project | null> {
    try {
      const command = new GetCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA',
        },
      });

      const result = await dynamoDBDocClient.send(command);
      return result.Item as Project || null;
    } catch (error) {
      logger.error('Error getting project by ID:', error);
      throw error;
    }
  }

  async getProjectsByOwner(ownerId: string): Promise<Project[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pkPrefix) AND ownerId = :ownerId',
        ExpressionAttributeValues: {
          ':pkPrefix': 'PROJECT#',
          ':ownerId': ownerId,
        },
      });

      const result = await dynamoDBDocClient.send(command);
      return (result.Items as Project[]) || [];
    } catch (error) {
      logger.error('Error getting projects by owner:', error);
      throw error;
    }
  }

  async getProjectsByStatus(status: ProjectStatus): Promise<Project[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :status',
        ExpressionAttributeValues: {
          ':status': status,
        },
      });

      const result = await dynamoDBDocClient.send(command);
      return (result.Items as Project[]) || [];
    } catch (error) {
      logger.error('Error getting projects by status:', error);
      throw error;
    }
  }

  async updateProject(projectId: string, updates: {
    requirements?: Partial<ProjectRequirements>;
    status?: ProjectStatus;
    councilData?: CouncilData;
    sowId?: string;
    selectedQuoteId?: string;
    contractId?: string;
  }): Promise<Project> {
    try {
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      // Merge requirements if provided
      let updatedRequirements = existingProject.requirements;
      if (updates.requirements) {
        updatedRequirements = {
          ...existingProject.requirements,
          ...updates.requirements
        };

        // Validate updated requirements
        const validationErrors = ProjectModel.validateRequirements(
          updatedRequirements, 
          existingProject.projectType
        );
        if (validationErrors.length > 0) {
          throw new Error(`Requirements validation failed: ${validationErrors.join(', ')}`);
        }
      }

      const updatedProject = ProjectModel.update(existingProject, {
        ...updates,
        requirements: updatedRequirements
      });

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedProject,
      });

      await dynamoDBDocClient.send(command);

      logger.info('Project updated successfully', { 
        projectId,
        updates: Object.keys(updates)
      });
      
      return updatedProject;
    } catch (error) {
      logger.error('Error updating project:', error);
      throw error;
    }
  }

  async updateProjectStatus(projectId: string, status: ProjectStatus): Promise<Project> {
    try {
      return await this.updateProject(projectId, { status });
    } catch (error) {
      logger.error('Error updating project status:', error);
      throw error;
    }
  }

  async addDocument(projectId: string, document: Document): Promise<Project> {
    try {
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      const updatedProject = ProjectModel.addDocument(existingProject, document);

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedProject,
      });

      await dynamoDBDocClient.send(command);

      logger.info('Document added to project', { 
        projectId, 
        documentId: document.id,
        filename: document.filename 
      });
      
      return updatedProject;
    } catch (error) {
      logger.error('Error adding document to project:', error);
      throw error;
    }
  }

  async updateCouncilData(projectId: string, councilData: CouncilData): Promise<Project> {
    try {
      const existingProject = await this.getProjectById(projectId);
      if (!existingProject) {
        throw new Error('Project not found');
      }

      const updatedProject = ProjectModel.updateCouncilData(existingProject, councilData);

      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: updatedProject,
      });

      await dynamoDBDocClient.send(command);

      logger.info('Council data updated for project', { 
        projectId,
        localAuthority: councilData.localAuthority 
      });
      
      return updatedProject;
    } catch (error) {
      logger.error('Error updating council data:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string): Promise<void> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const command = new DeleteCommand({
        TableName: TABLE_NAME,
        Key: {
          PK: `PROJECT#${projectId}`,
          SK: 'METADATA',
        },
      });

      await dynamoDBDocClient.send(command);

      logger.info('Project deleted successfully', { 
        projectId, 
        ownerId: project.ownerId 
      });
    } catch (error) {
      logger.error('Error deleting project:', error);
      throw error;
    }
  }

  async getProjectTypeInfo(projectType: ProjectType): Promise<{
    title: string;
    description: string;
    typicalCost: string;
    timeframe: string;
    planningRequired: boolean;
    buildingRegsRequired: boolean;
    keyConsiderations: string[];
  }> {
    try {
      return ProjectModel.getProjectTypeInfo(projectType);
    } catch (error) {
      logger.error('Error getting project type info:', error);
      throw error;
    }
  }

  async getProjectProgress(projectId: string): Promise<{
    currentStep: string;
    nextStep: string;
    description: string;
    actionRequired: string;
    completionPercentage: number;
  }> {
    try {
      const project = await this.getProjectById(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      const stepInfo = ProjectModel.getNextSteps(project.status);
      const completionPercentage = ProjectModel.calculateCompletionPercentage(project);

      return {
        ...stepInfo,
        completionPercentage
      };
    } catch (error) {
      logger.error('Error getting project progress:', error);
      throw error;
    }
  }

  async getProjectDashboard(ownerId: string): Promise<{
    projects: Omit<Project, 'GSI2PK' | 'GSI2SK'>[];
    summary: {
      total: number;
      active: number;
      completed: number;
      draft: number;
    };
  }> {
    try {
      const projects = await this.getProjectsByOwner(ownerId);
      
      const summary = {
        total: projects.length,
        active: projects.filter(p => ['active', 'quote-collection', 'quote-review', 'contract-generation'].includes(p.status)).length,
        completed: projects.filter(p => p.status === 'completed').length,
        draft: projects.filter(p => ['draft', 'requirements-gathering'].includes(p.status)).length,
      };

      logger.info('Project dashboard retrieved', { 
        ownerId, 
        projectCount: projects.length 
      });

      return {
        projects: projects.map(p => ProjectModel.sanitizeForResponse(p)),
        summary
      };
    } catch (error) {
      logger.error('Error getting project dashboard:', error);
      throw error;
    }
  }

  async validateProjectOwnership(projectId: string, ownerId: string): Promise<boolean> {
    try {
      const project = await this.getProjectById(projectId);
      return project?.ownerId === ownerId;
    } catch (error) {
      logger.error('Error validating project ownership:', error);
      return false;
    }
  }

  async getProjectsByStatusAndOwner(status: ProjectStatus, ownerId: string): Promise<Project[]> {
    try {
      const allProjects = await this.getProjectsByOwner(ownerId);
      return allProjects.filter(project => project.status === status);
    } catch (error) {
      logger.error('Error getting projects by status and owner:', error);
      throw error;
    }
  }

  async getProjectStatistics(): Promise<{
    totalProjects: number;
    projectsByStatus: Record<ProjectStatus, number>;
    projectsByType: Record<ProjectType, number>;
    averageCompletionTime: number;
  }> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'begins_with(PK, :pkPrefix)',
        ExpressionAttributeValues: {
          ':pkPrefix': 'PROJECT#',
        },
      });

      const result = await dynamoDBDocClient.send(command);
      const projects = (result.Items as Project[]) || [];

      const projectsByStatus = projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1;
        return acc;
      }, {} as Record<ProjectStatus, number>);

      const projectsByType = projects.reduce((acc, project) => {
        acc[project.projectType] = (acc[project.projectType] || 0) + 1;
        return acc;
      }, {} as Record<ProjectType, number>);

      // Calculate average completion time for completed projects
      const completedProjects = projects.filter(p => p.status === 'completed');
      const averageCompletionTime = completedProjects.length > 0
        ? completedProjects.reduce((acc, project) => {
            const created = new Date(project.createdAt);
            const updated = new Date(project.updatedAt);
            return acc + (updated.getTime() - created.getTime());
          }, 0) / completedProjects.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        totalProjects: projects.length,
        projectsByStatus,
        projectsByType,
        averageCompletionTime: Math.round(averageCompletionTime)
      };
    } catch (error) {
      logger.error('Error getting project statistics:', error);
      throw error;
    }
  }
}