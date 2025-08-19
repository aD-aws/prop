import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Engineering as EngineeringIcon,
  Gavel as GavelIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    'Welcome',
    'How It Works',
    'Benefits',
    'Get Started',
  ];

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      if (isAuthenticated) {
        navigate('/projects/create');
      } else {
        navigate('/register');
      }
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Welcome to UK Home Improvement Platform
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
              We're here to guide you through every step of your home improvement journey, 
              from initial planning to finding the right builder.
            </Typography>
            <Box sx={{ mt: 4 }}>
              <EngineeringIcon sx={{ fontSize: 80, color: 'primary.main' }} />
            </Box>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
              How Our Platform Works
            </Typography>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h2" color="primary.main" gutterBottom>
                      1
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Tell Us About Your Project
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Answer simple questions about your property and what you want to achieve. 
                      Upload any existing plans or photos.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h2" color="primary.main" gutterBottom>
                      2
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      AI Creates Your Scope of Work
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Our AI analyzes your requirements and generates a detailed, 
                      professional Scope of Work following UK building standards.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 2 }}>
                  <CardContent>
                    <Typography variant="h2" color="primary.main" gutterBottom>
                      3
                    </Typography>
                    <Typography variant="h6" gutterBottom>
                      Get Quotes & Choose Builder
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Receive quotes from qualified builders, compare them easily, 
                      and select the best fit for your project.
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ py: 4 }}>
            <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
              Why Choose Our Platform?
            </Typography>
            <Grid container spacing={4} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Professional Standards"
                      secondary="All work follows RICS, RIBA, NRM1/NRM2, and NHBC guidelines"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="UK Building Regulations"
                      secondary="Automatic compliance checking with local authority requirements"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Plain English Guidance"
                      secondary="Complex technical terms explained in simple language"
                    />
                  </ListItem>
                </List>
              </Grid>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="AI-Powered Assistance"
                      secondary="24/7 help with questions and guidance through each step"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Accurate Cost Estimates"
                      secondary="Based on current UK market rates and material costs"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Qualified Builders"
                      secondary="Connect with vetted, certified builders in your area"
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Box>
        );

      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h4" component="h2" gutterBottom>
              Ready to Start Your Project?
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ maxWidth: 600, mx: 'auto' }}>
              {isAuthenticated 
                ? "You're all set! Let's create your first project and get started with the planning process."
                : "Create your free account to begin planning your home improvement project with AI-powered guidance."
              }
            </Typography>
            <Box sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <SecurityIcon sx={{ fontSize: 60, color: 'primary.main' }} />
              <Typography variant="body2" color="text.secondary">
                Your data is secure and GDPR compliant
              </Typography>
            </Box>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Stepper 
          activeStep={activeStep} 
          alternativeLabel={!isMobile}
          orientation={isMobile ? 'vertical' : 'horizontal'}
        >
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <Card sx={{ minHeight: 400 }}>
        <CardContent>
          {renderStepContent(activeStep)}
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={handleBack}
          disabled={activeStep === 0}
          startIcon={<ArrowBackIcon />}
        >
          Back
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          endIcon={<ArrowForwardIcon />}
        >
          {activeStep === steps.length - 1 
            ? (isAuthenticated ? 'Start Project' : 'Sign Up') 
            : 'Next'
          }
        </Button>
      </Box>

      {/* Skip to main action */}
      <Box sx={{ textAlign: 'center', mt: 2 }}>
        <Button
          variant="text"
          onClick={() => navigate(isAuthenticated ? '/projects/create' : '/register')}
        >
          {isAuthenticated ? 'Skip to Project Creation' : 'Skip to Registration'}
        </Button>
      </Box>
    </Container>
  );
};

export default OnboardingPage;