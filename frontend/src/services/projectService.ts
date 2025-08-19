import { apiService } from './api';

export interface Project {
  id: string;
  ownerId: string;
  propertyAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  projectType: 'loft_conversion' | 'extension' | 'renovation' | 'new_build' | 'other';
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  requirements: {
    description: string;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    materials?: string[];
    timeline?: string;
    budget?: {
      min?: number;
      max?: number;
    };
    specialRequirements?: string[];
  };
  documents: Array<{
    id: string;
    name: string;
    type: string;
    url: string;
    uploadedAt: string;
  }>;
  councilData?: {
    conservationArea: boolean;
    listedBuilding: boolean;
    planningRestrictions: string[];
    localAuthority: string;
  };
  sowId?: string;
  selectedQuoteId?: string;
  contractId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectData {
  propertyAddress: Project['propertyAddress'];
  projectType: Project['projectType'];
  requirements: Project['requirements'];
}

class ProjectService {
  async createProject(projectData: CreateProjectData): Promise<Project> {
    return apiService.post<Project>('/projects', projectData);
  }

  async getProject(projectId: string): Promise<Project> {
    return apiService.get<Project>(`/projects/${projectId}`);
  }

  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    return apiService.put<Project>(`/projects/${projectId}`, updates);
  }

  async getUserProjects(): Promise<Project[]> {
    return apiService.get<Project[]>('/projects');
  }

  async uploadDocument(projectId: string, file: File, onProgress?: (progress: number) => void): Promise<{
    id: string;
    name: string;
    type: string;
    url: string;
  }> {
    return apiService.uploadFile(`/projects/${projectId}/documents`, file, onProgress);
  }

  async deleteDocument(projectId: string, documentId: string): Promise<void> {
    return apiService.delete(`/projects/${projectId}/documents/${documentId}`);
  }

  async validateAddress(address: Partial<Project['propertyAddress']>): Promise<{
    isValid: boolean;
    suggestions?: Project['propertyAddress'][];
    councilData?: Project['councilData'];
  }> {
    return apiService.post('/projects/validate-address', { address });
  }

  async getProjectTypes(): Promise<Array<{
    id: string;
    name: string;
    description: string;
    estimatedDuration: string;
    estimatedCost: string;
    complexity: 'low' | 'medium' | 'high';
    requiresPlanning: boolean;
  }>> {
    return apiService.get('/projects/types');
  }
}

export const projectService = new ProjectService();