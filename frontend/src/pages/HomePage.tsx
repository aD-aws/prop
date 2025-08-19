import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Home as HomeIcon,
  Engineering as EngineeringIcon,
  Gavel as GavelIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <EngineeringIcon sx={{ fontSize: 40 }} />,
      title: 'AI-Powered Planning',
      description: 'Our AI analyzes your requirements and generates detailed, compliant Scopes of Work following UK building regulations.',
    },
    {
      icon: <GavelIcon sx={{ fontSize: 40 }} />,
      title: 'Industry Standards',
      description: 'All projects follow RICS, RIBA Plan of Work, NRM1/NRM2, and NHBC standards for professional quality.',
    },
    {
      icon: <SecurityIcon sx={{ fontSize: 40 }} />,
      title: 'Compliance Checking',
      description: 'Automatic validation against UK building regulations, planning permissions, and local authority requirements.',
    },
    {
      icon: <SpeedIcon sx={{ fontSize: 40 }} />,
      title: 'Streamlined Process',
      description: 'From initial planning to contract signing, our platform guides you through every step with clear explanations.',
    },
    {
      icon: <SupportIcon sx={{ fontSize: 40 }} />,
      title: '24/7 AI Guidance',
      description: 'Get instant help and explanations for technical terms, regulations, and next steps in plain English.',
    },
    {
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      title: 'UK-Focused',
      description: 'Built specifically for UK homeowners with local council integration and British construction standards.',
    },
  ];

  const projectTypes = [
    {
      title: 'Loft Conversions',
      description: 'Transform your loft into a functional living space',
      estimatedCost: '£15,000 - £60,000',
      duration: '4-8 weeks',
    },
    {
      title: 'Extensions',
      description: 'Single or double-story extensions to expand your home',
      estimatedCost: '£20,000 - £80,000',
      duration: '8-16 weeks',
    },
    {
      title: 'Kitchen Renovations',
      description: 'Complete kitchen refurbishment and modernization',
      estimatedCost: '£10,000 - £40,000',
      duration: '3-6 weeks',
    },
    {
      title: 'Bathroom Renovations',
      description: 'Full bathroom redesign and installation',
      estimatedCost: '£5,000 - £25,000',
      duration: '2-4 weeks',
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          py: { xs: 8, md: 12 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="h1"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              fontWeight: 700,
              mb: 3,
            }}
          >
            Transform Your Home with AI-Powered Planning
          </Typography>
          <Typography
            variant="h5"
            component="p"
            sx={{
              mb: 4,
              opacity: 0.9,
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.6,
            }}
          >
            Get professional-grade Scopes of Work, accurate cost estimates, and connect with qualified builders. 
            All compliant with UK building regulations and industry standards.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            {isAuthenticated ? (
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/projects/create')}
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  px: 4,
                  py: 1.5,
                  fontSize: '1.1rem',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
              >
                Start New Project
              </Button>
            ) : (
              <>
                <Button
                  variant="contained"
                  size="large"
                  onClick={() => navigate('/onboarding')}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      bgcolor: 'grey.100',
                    },
                  }}
                >
                  Get Started
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={() => navigate('/register')}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Sign Up Free
                </Button>
              </>
            )}
          </Box>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
        <Typography
          variant="h2"
          component="h2"
          textAlign="center"
          gutterBottom
          sx={{ mb: 6 }}
        >
          Why Choose Our Platform?
        </Typography>
        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  textAlign: 'center',
                  p: 2,
                }}
              >
                <CardContent sx={{ flex: 1 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Project Types Section */}
      <Box sx={{ bgcolor: 'grey.50', py: { xs: 8, md: 12 } }}>
        <Container maxWidth="lg">
          <Typography
            variant="h2"
            component="h2"
            textAlign="center"
            gutterBottom
            sx={{ mb: 6 }}
          >
            Popular Project Types
          </Typography>
          <Grid container spacing={4}>
            {projectTypes.map((project, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1 }}>
                    <Typography variant="h6" component="h3" gutterBottom>
                      {project.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                      {project.description}
                    </Typography>
                    <Typography variant="body2" color="primary.main" gutterBottom>
                      <strong>Estimated Cost:</strong> {project.estimatedCost}
                    </Typography>
                    <Typography variant="body2" color="primary.main">
                      <strong>Duration:</strong> {project.duration}
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigate(isAuthenticated ? '/projects/create' : '/onboarding')}
                    >
                      Learn More
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, textAlign: 'center' }}>
        <Typography variant="h3" component="h2" gutterBottom>
          Ready to Start Your Project?
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
          Join thousands of UK homeowners who have successfully planned their home improvements with our AI-powered platform.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => navigate(isAuthenticated ? '/projects/create' : '/onboarding')}
          sx={{ px: 4, py: 1.5, fontSize: '1.1rem' }}
        >
          {isAuthenticated ? 'Start New Project' : 'Get Started Today'}
        </Button>
      </Container>
    </Box>
  );
};

export default HomePage;