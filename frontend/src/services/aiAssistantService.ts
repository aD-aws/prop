import { apiService } from './api';

interface AIResponse {
  response: string;
  context?: string;
}

class AIAssistantService {
  async sendMessage(message: string, context?: string): Promise<string> {
    const response = await apiService.post<AIResponse>('/ai/chat', {
      message,
      context,
    });
    return response.response;
  }

  async getTermExplanation(term: string): Promise<string> {
    const response = await apiService.post<AIResponse>('/ai/explain', {
      term,
    });
    return response.response;
  }

  async getStepGuidance(step: string, context?: any): Promise<string> {
    const response = await apiService.post<AIResponse>('/ai/guidance', {
      step,
      context,
    });
    return response.response;
  }

  async getEducationalContent(topic: string, userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<string> {
    const response = await apiService.post<AIResponse>('/ai/educational-content', {
      topic,
      userLevel,
    });
    return response.response;
  }

  async validateInput(input: any, validationType: string): Promise<{
    isValid: boolean;
    suggestions?: string[];
    explanation?: string;
  }> {
    return apiService.post('/ai/validate', {
      input,
      validationType,
    });
  }
}

export const aiAssistantService = new AIAssistantService();