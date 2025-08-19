import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import HomePage from '../../pages/HomePage';
import theme from '../../theme';
import { AuthProvider } from '../../contexts/AuthContext';
import { AIAssistantProvider } from '../../contexts/AIAssistantContext';

// Mock the contexts
jest.mock('../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    loading: false,
  }),
}));

jest.mock('../../contexts/AIAssistantContext', () => ({
  AIAssistantProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAIAssistant: () => ({
    openChat: jest.fn(),
  }),
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider theme={theme}>
        <AuthProvider>
          <AIAssistantProvider>
            {component}
          </AIAssistantProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('HomePage', () => {
  test('renders main heading', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Transform Your Home with AI-Powered Planning/i)).toBeInTheDocument();
  });

  test('renders features section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Why Choose Our Platform?/i)).toBeInTheDocument();
    expect(screen.getByText(/AI-Powered Planning/i)).toBeInTheDocument();
    expect(screen.getByText(/Industry Standards/i)).toBeInTheDocument();
  });

  test('renders project types section', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Popular Project Types/i)).toBeInTheDocument();
    expect(screen.getByText(/Loft Conversions/i)).toBeInTheDocument();
    expect(screen.getByText(/Extensions/i)).toBeInTheDocument();
  });

  test('renders call-to-action for non-authenticated users', () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Get Started/i)).toBeInTheDocument();
    expect(screen.getByText(/Sign Up Free/i)).toBeInTheDocument();
  });
});