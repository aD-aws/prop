import { apiService } from './api';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    userType: 'homeowner' | 'builder' | 'admin';
    profile: {
      firstName: string;
      lastName: string;
      phone?: string;
    };
  };
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'homeowner' | 'builder';
  phone?: string;
}

class AuthService {
  async login(email: string, password: string): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
  }

  async register(userData: RegisterData): Promise<LoginResponse> {
    return apiService.post<LoginResponse>('/auth/register', userData);
  }

  async getCurrentUser(): Promise<LoginResponse['user']> {
    return apiService.get<LoginResponse['user']>('/auth/me');
  }

  async updateProfile(profileData: Partial<RegisterData>): Promise<LoginResponse['user']> {
    return apiService.put<LoginResponse['user']>('/users/profile', profileData);
  }

  async requestPasswordReset(email: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/users/forgot-password', { email });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return apiService.post<{ message: string }>('/users/reset-password', {
      token,
      password: newPassword,
    });
  }
}

export const authService = new AuthService();