import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { AIAssistantProvider } from './contexts/AIAssistantContext';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import OnboardingPage from './pages/OnboardingPage';
import ProjectCreationPage from './pages/ProjectCreationPage';
import ProjectDashboardPage from './pages/ProjectDashboardPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BuilderDashboardPage from './pages/BuilderDashboardPage';
import SoWReviewPage from './pages/SoWReviewPage';
import QuoteSubmissionPage from './pages/QuoteSubmissionPage';
import QuoteDetailsPage from './pages/QuoteDetailsPage';
import BuilderProfilePage from './pages/BuilderProfilePage';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import AIAssistantChat from './components/AIAssistant/AIAssistantChat';

function App() {
  return (
    <AuthProvider>
      <AIAssistantProvider>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Skip to main content link for accessibility */}
          <a href="#main-content" className="skip-link">
            Skip to main content
          </a>
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="onboarding" element={<OnboardingPage />} />
              <Route 
                path="projects/create" 
                element={
                  <ProtectedRoute>
                    <ProjectCreationPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="projects/:projectId" 
                element={
                  <ProtectedRoute>
                    <ProjectDashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="dashboard" 
                element={
                  <ProtectedRoute>
                    <ProjectDashboardPage />
                  </ProtectedRoute>
                } 
              />
              {/* Builder Routes */}
              <Route 
                path="builder/dashboard" 
                element={
                  <ProtectedRoute>
                    <BuilderDashboardPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="builder/sow/:sowId" 
                element={
                  <ProtectedRoute>
                    <SoWReviewPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="builder/quote/:sowId" 
                element={
                  <ProtectedRoute>
                    <QuoteSubmissionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="builder/quotes/:quoteId" 
                element={
                  <ProtectedRoute>
                    <QuoteDetailsPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="builder/quotes/:quoteId/edit" 
                element={
                  <ProtectedRoute>
                    <QuoteSubmissionPage />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="builder/profile" 
                element={
                  <ProtectedRoute>
                    <BuilderProfilePage />
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          
          {/* AI Assistant Chat - Available on all pages */}
          <AIAssistantChat />
        </Box>
      </AIAssistantProvider>
    </AuthProvider>
  );
}

export default App;