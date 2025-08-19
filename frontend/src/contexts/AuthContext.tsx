import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import Amplify, { Auth } from 'aws-amplify';
import awsConfig from '../aws-config';

// Configure Amplify
Amplify.configure(awsConfig);

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

  // Convert Cognito user to our User interface
  const convertCognitoUser = async (cognitoUser: any): Promise<User> => {
    try {
      const session = await Auth.currentSession();
      const idToken = session.getIdToken();
      const payload = idToken.payload;

      return {
        id: cognitoUser.username,
        email: payload.email || cognitoUser.attributes?.email || '',
        userType: (payload['custom:user_type'] || cognitoUser.attributes?.['custom:user_type']) || 'homeowner',
        profile: {
          firstName: payload.given_name || cognitoUser.attributes?.given_name || '',
          lastName: payload.family_name || cognitoUser.attributes?.family_name || '',
          phone: payload.phone_number || cognitoUser.attributes?.phone_number || '',
          companyName: payload['custom:company_name'] || cognitoUser.attributes?.['custom:company_name'] || '',
        },
      };
    } catch (error) {
      console.error('Error converting Cognito user:', error);

      // Fallback user object
      return {
        id: cognitoUser.username || 'unknown',
        email: cognitoUser.attributes?.email || '',
        userType: 'homeowner',
        profile: {
          firstName: cognitoUser.attributes?.given_name || '',
          lastName: cognitoUser.attributes?.family_name || '',
          phone: cognitoUser.attributes?.phone_number || '',
        },
      };
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const cognitoUser = await Auth.currentAuthenticatedUser();
        if (cognitoUser) {
          const userData = await convertCognitoUser(cognitoUser);
          setUser(userData);
        }
      } catch (error) {
        console.log('No authenticated user found');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const cognitoUser = await Auth.signIn(email, password);

      if (cognitoUser) {
        const userData = await convertCognitoUser(cognitoUser);
        setUser(userData);
      }
    } catch (error: any) {
      console.error('Login error:', error);

      // Handle specific Cognito errors
      if (error.code === 'NotAuthorizedException') {
        throw new Error('Invalid email or password');
      } else if (error.code === 'UserNotConfirmedException') {
        throw new Error('Please verify your email address');
      } else if (error.code === 'PasswordResetRequiredException') {
        throw new Error('Password reset required');
      } else if (error.code === 'UserNotFoundException') {
        throw new Error('User not found');
      } else {
        throw new Error(error.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<{ needsConfirmation: boolean }> => {
    try {
      const result = await Auth.signUp({
        username: userData.email,
        password: userData.password,
        attributes: {
          email: userData.email,
          given_name: userData.firstName,
          family_name: userData.lastName,
          phone_number: userData.phone || '',
          'custom:user_type': userData.userType,
          'custom:company_name': userData.companyName || '',
        },
      });

      return { needsConfirmation: !result.userConfirmed };
    } catch (error: any) {
      console.error('Registration error:', error);

      if (error.code === 'UsernameExistsException') {
        throw new Error('An account with this email already exists');
      } else if (error.code === 'InvalidPasswordException') {
        throw new Error('Password does not meet requirements');
      } else {
        throw new Error(error.message || 'Registration failed');
      }
    }
  };

  const confirmRegistration = async (email: string, code: string) => {
    try {
      await Auth.confirmSignUp(email, code);
    } catch (error: any) {
      console.error('Confirmation error:', error);

      if (error.code === 'CodeMismatchException') {
        throw new Error('Invalid confirmation code');
      } else if (error.code === 'ExpiredCodeException') {
        throw new Error('Confirmation code has expired');
      } else {
        throw new Error(error.message || 'Confirmation failed');
      }
    }
  };

  const logout = async () => {
    try {
      await Auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
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