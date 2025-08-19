import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import AIAssistantChat from '../AIAssistant/AIAssistantChat';
import theme from '../../theme';
import { AIAssistantProvider } from '../../contexts/AIAssistantContext';

// Mock the AI Assistant service
jest.mock('../../services/aiAssistantService', () => ({
  aiAssistantService: {
    sendMessage: jest.fn().mockResolvedValue('Mock AI response'),
    getTermExplanation: jest.fn().mockResolvedValue('Mock explanation'),
    getStepGuidance: jest.fn().mockResolvedValue('Mock guidance'),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      <AIAssistantProvider>
        {component}
      </AIAssistantProvider>
    </ThemeProvider>
  );
};

describe('AIAssistantChat', () => {
  test('renders floating action button', () => {
    renderWithProviders(<AIAssistantChat />);
    expect(screen.getByLabelText(/AI Assistant/i)).toBeInTheDocument();
  });

  test('opens chat dialog when FAB is clicked', async () => {
    renderWithProviders(<AIAssistantChat />);
    
    const fab = screen.getByLabelText(/AI Assistant/i);
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
    });
  });

  test('displays initial welcome message', async () => {
    renderWithProviders(<AIAssistantChat />);
    
    const fab = screen.getByLabelText(/AI Assistant/i);
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText(/Hello! I'm here to help guide you/i)).toBeInTheDocument();
    });
  });

  test('displays quick action chips', async () => {
    renderWithProviders(<AIAssistantChat />);
    
    const fab = screen.getByLabelText(/AI Assistant/i);
    fireEvent.click(fab);

    await waitFor(() => {
      expect(screen.getByText(/Explain building regulations/i)).toBeInTheDocument();
      expect(screen.getByText(/What is a loft conversion?/i)).toBeInTheDocument();
    });
  });

  test('allows sending messages', async () => {
    renderWithProviders(<AIAssistantChat />);
    
    const fab = screen.getByLabelText(/AI Assistant/i);
    fireEvent.click(fab);

    await waitFor(() => {
      const input = screen.getByPlaceholderText(/Ask me anything/i);
      fireEvent.change(input, { target: { value: 'Test message' } });
      
      const sendButton = screen.getByRole('button', { name: /send/i });
      fireEvent.click(sendButton);
    });

    // The message should be sent and input cleared
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/Ask me anything/i) as HTMLInputElement;
      expect(input.value).toBe('');
    });
  });
});