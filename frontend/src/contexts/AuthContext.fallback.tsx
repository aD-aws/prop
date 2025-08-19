import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authService } from '../services/authService';

// Fallback AuthContext without AWS Amplify
// Use this if you're having issues with AWS Amplify dependencies

interface User {
  id: string;
  email: string;
  userType: 'homeowner' | 'builder' | 'admin';
  profile: {
    firstName: string;
    lastName: string;
    phone?: string;
    companyName?: string;
  };
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'homeowner' | 'builder';
  phone?: string;
  companyName?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<{ needsConfirmation: boolean }>;
  confirmRegistration: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (token) {
          const userData = await authService.getCurrentUser();
          setUser(userData);
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        localStorage.removeItem('authToken');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const response = await authService.login(email, password);
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ needsConfirmation: boolean }> => {
    try {
      const response = await authService.register(userData);
      localStorage.setItem('authToken', response.token);
      setUser(response.user);
      return { needsConfirmation: false };
    } catch (error) {
      throw error;
    }
  };

  const confirmRegistration = async (email: string, code: string) => {
    // Mock implementation for fallback
    console.log('Confirmation not needed in fallback mode');
  };

  const logout = async () => {
    localStorage.removeItem('authToken');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    confirmRegistration,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};