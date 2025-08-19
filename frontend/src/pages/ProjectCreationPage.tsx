import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Button,
  useTheme,
  useMediaQuery,
  Alert,
  CircularProgress,
} from '@mui/material';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { projectService, CreateProjectData } from '../services/projectService';
import AddressStep from '../components/ProjectCreation/AddressStep';
import ProjectTypeStep from '../components/ProjectCreation/ProjectTypeStep';
import RequirementsStep from '../components/ProjectCreation/RequirementsStep';
import DocumentsStep from '../components/ProjectCreation/DocumentsStep';
import ReviewStep from '../components/ProjectCreation/ReviewStep';

const steps = [
  'Property Address',
  'Project Type',
  'Requirements',
  'Documents',
  'Review & Create',
];

interface ProjectFormData {
  propertyAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    country: string;
  };
  projectType: 'loft_conversion' | 'extension' | 'renovation' | 'new_build' | 'other';
  requirements: {
    description: string;
    dimensions?: {
      length?: number;
      width?: number;
      height?: number;
    };
    materials?: string[];
    timeline?: string;
    budget?: {
      min?: number;
      max?: number;
    };
    specialRequirements?: string[];
  };
  documents?: File[];
}

const ProjectCreationPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getGuidance } = useAIAssistant();

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<ProjectFormData>({
    propertyAddress: {
      line1: '',
      city: '',
      postcode: '',
      country: 'United Kingdom',
    },
    projectType: 'loft_conversion',
    requirements: {
      description: '',
    },
    documents: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [guidance, setGuidance] = useState<string>('');

  useEffect(() => {
    // Get AI guidance for the current step
    const getStepGuidance = async () => {
      try {
        const stepGuidance = await getGuidance(steps[activeStep], { 
          step: activeStep, 
          formData 
        });
        setGuidance(stepGuidance);
      } catch (err) {
        console.error('Failed to get guidance:', err);
      }
    };

    getStepGuidance();
  }, [activeStep, getGuidance]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
      const projectData: CreateProjectData = {
        propertyAddress: formData.propertyAddress,
        projectType: formData.projectType,
        requirements: formData.requirements,
      };

      const project = await projectService.createProject(projectData);

      // Upload documents if any
      if (formData.documents && formData.documents.length > 0) {
        for (const document of formData.documents) {
          await projectService.uploadDocument(project.id, document);
        }
      }

      navigate(`/projects/${project.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFormData = (stepData: Partial<ProjectFormData>) => {
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0: // Address
        return !!(formData.propertyAddress.line1 && 
                 formData.propertyAddress.city && 
                 formData.propertyAddress.postcode);
      case 1: // Project Type
        return !!formData.projectType;
      case 2: // Requirements
        return !!formData.requirements.description;
      case 3: // Documents
        return true; // Optional step
      case 4: // Review
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <AddressStep
            data={formData.propertyAddress}
            onChange={(address) => updateFormData({ propertyAddress: address })}
          />
        );
      case 1:
        return (
          <ProjectTypeStep
            data={formData.projectType}
            onChange={(projectType) => updateFormData({ projectType })}
          />
        );
      case 2:
        return (
          <RequirementsStep
            data={formData.requirements}
            projectType={formData.projectType}
            onChange={(requirements) => updateFormData({ requirements })}
          />
        );
      case 3:
        return (
          <DocumentsStep
            data={formData.documents || []}
            onChange={(documents) => updateFormData({ documents })}
          />
        );
      case 4:
        return (
          <ReviewStep
            data={formData}
            onChange={updateFormData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Create New Project
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Let's gather information about your home improvement project to create a detailed scope of work.
        </Typography>
      </Box>

      {/* Progress Stepper */}
      <Box sx={{ mb: 4 }}>
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? 'vertical' : 'horizontal'}
        >
          {steps.map((label, index) => (
            <Step key={label} completed={index < activeStep || isStepValid(index)}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* AI Guidance */}
      {guidance && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          icon={false}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            💡 AI Guidance:
          </Typography>
          <Typography variant="body2">
            {guidance}
          </Typography>
        </Alert>
      )}

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Step Content */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0 || isLoading}
          startIcon={<ArrowBack />}
          size="large"
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={!isStepValid(activeStep) || isLoading}
          endIcon={isLoading ? <CircularProgress size={20} /> : <ArrowForward />}
          size="large"
        >
          {activeStep === steps.length - 1 ? 'Create Project' : 'Next'}
        </Button>
      </Box>

      {/* Progress Indicator */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {steps.length}
        </Typography>
      </Box>
    </Container>
  );
};

export default ProjectCreationPage;