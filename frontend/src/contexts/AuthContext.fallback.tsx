import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Fallback AuthContext for when AWS Amplify is not available
// This provides the same interface but with mock functionality

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
  const [loading, setLoading] = useState(false);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // Mock authentication - replace with actual API call
      if (email === 'homeowner@test.com' && password === 'Password123!') {
        const mockUser: User = {
          id: '1',
          email: 'homeowner@test.com',
          userType: 'homeowner',
          profile: {
            firstName: 'John',
            lastName: 'Smith',
            phone: '+44 7700 900123',
          },
        };
        setUser(mockUser);
      } else if (email === 'builder@test.com' && password === 'Password123!') {
        const mockUser: User = {
          id: '2',
          email: 'builder@test.com',
          userType: 'builder',
          profile: {
            firstName: 'Mike',
            lastName: 'Builder',
            phone: '+44 7700 900456',
            companyName: 'Builder Co Ltd',
          },
        };
        setUser(mockUser);
      } else {
        throw new Error('Invalid email or password');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ needsConfirmation: boolean }> => {
    // Mock registration
    return { needsConfirmation: false };
  };

  const confirmRegistration = async (email: string, code: string) => {
    // Mock confirmation
  };

  const logout = async () => {
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