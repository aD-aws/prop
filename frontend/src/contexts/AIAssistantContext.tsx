import React, { createContext, useContext, useState, ReactNode } from 'react';
import { aiAssistantService } from '../services/aiAssistantService';

interface AIMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  context?: string;
}

interface AIAssistantContextType {
  isOpen: boolean;
  messages: AIMessage[];
  isLoading: boolean;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (message: string, context?: string) => Promise<void>;
  clearMessages: () => void;
  getExplanation: (term: string) => Promise<string>;
  getGuidance: (step: string, context?: any) => Promise<string>;
  getEducationalContent: (topic: string, userLevel?: 'beginner' | 'intermediate' | 'advanced') => Promise<string>;
}

const AIAssistantContext = createContext<AIAssistantContextType | undefined>(undefined);

export const useAIAssistant = () => {
  const context = useContext(AIAssistantContext);
  if (context === undefined) {
    throw new Error('useAIAssistant must be used within an AIAssistantProvider');
  }
  return context;
};

interface AIAssistantProviderProps {
  children: ReactNode;
}

export const AIAssistantProvider: React.FC<AIAssistantProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hello! I\'m here to help guide you through your home improvement project. I can explain technical terms, provide guidance on next steps, and answer questions about UK building regulations. How can I assist you today?',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const openChat = () => setIsOpen(true);
  const closeChat = () => setIsOpen(false);

  const sendMessage = async (message: string, context?: string) => {
    const userMessage: AIMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date(),
      context,
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await aiAssistantService.sendMessage(message, context);
      
      const assistantMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: AIMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        id: '1',
        type: 'assistant',
        content: 'Hello! I\'m here to help guide you through your home improvement project. How can I assist you today?',
        timestamp: new Date(),
      },
    ]);
  };

  const getExplanation = async (term: string): Promise<string> => {
    try {
      return await aiAssistantService.getTermExplanation(term);
    } catch (error) {
      return `I'm sorry, I couldn't provide an explanation for "${term}" at the moment. Please try again later.`;
    }
  };

  const getGuidance = async (step: string, context?: any): Promise<string> => {
    try {
      return await aiAssistantService.getStepGuidance(step, context);
    } catch (error) {
      return 'I\'m sorry, I couldn\'t provide guidance at the moment. Please try again later.';
    }
  };

  const getEducationalContent = async (topic: string, userLevel: 'beginner' | 'intermediate' | 'advanced' = 'beginner'): Promise<string> => {
    try {
      return await aiAssistantService.getEducationalContent(topic, userLevel);
    } catch (error) {
      return 'Educational content is temporarily unavailable. Please try again later.';
    }
  };

  const value: AIAssistantContextType = {
    isOpen,
    messages,
    isLoading,
    openChat,
    closeChat,
    sendMessage,
    clearMessages,
    getExplanation,
    getGuidance,
    getEducationalContent,
  };

  return (
    <AIAssistantContext.Provider value={value}>
      {children}
    </AIAssistantContext.Provider>
  );
};