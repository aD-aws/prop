import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add Cognito auth token
    this.api.interceptors.request.use(
      async (config) => {
        try {
          // Import Auth dynamically to avoid circular dependencies
          const { Auth } = await import('aws-amplify');
          const session = await Auth.currentSession();
          
          if (session) {
            const accessToken = session.getAccessToken();
            config.headers.Authorization = `Bearer ${accessToken.getJwtToken()}`;
          }
        } catch (error) {
          console.log('No auth session found');
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          try {
            // Sign out from Cognito
            const { Auth } = await import('aws-amplify');
            await Auth.signOut();
          } catch (signOutError) {
            console.error('Error signing out:', signOutError);
          }
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.get(url, config);
    // Handle both local server format (response.data.data) and AWS Lambda format (response.data)
    return response.data.data || response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.post(url, data, config);
    // Handle both local server format (response.data.data) and AWS Lambda format (response.data)
    return response.data.data || response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  async uploadFile<T>(url: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await this.api.post(url, formData, config);
    return response.data;
  }
}

export const apiService = new ApiService();