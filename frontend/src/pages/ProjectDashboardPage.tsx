import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  LinearProgress,
  Alert,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme,
  useMediaQuery,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  Description as DescriptionIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useAIAssistant } from '../contexts/AIAssistantContext';
import { projectService, Project } from '../services/projectService';

const ProjectDashboardPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { getGuidance } = useAIAssistant();

  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [nextStepGuidance, setNextStepGuidance] = useState<string>('');

  const projectSteps = [
    { label: 'Project Created', description: 'Basic project information collected' },
    { label: 'AI Analysis', description: 'AI analyzing requirements and generating Scope of Work' },
    { label: 'Scope Review', description: 'Review and approve the generated Scope of Work' },
    { label: 'Builder Matching', description: 'Share SoW with qualified builders' },
    { label: 'Quote Collection', description: 'Receive and compare builder quotes' },
    { label: 'Builder Selection', description: 'Select preferred builder and finalize contract' },
    { label: 'Project Execution', description: 'Work begins according to agreed timeline' },
  ];

  useEffect(() => {
    const loadData = async () => {
      try {
        if (projectId) {
          // Load specific project
          const projectData = await projectService.getProject(projectId);
          setProject(projectData);
          
          // Get AI guidance for next steps
          const guidance = await getGuidance('project next steps', {
            project: projectData,
            currentStatus: projectData.status,
          });
          setNextStepGuidance(guidance);
        } else {
          // Load all user projects for dashboard view
          const userProjects = await projectService.getUserProjects();
          setProjects(userProjects);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [projectId, getGuidance]);

  const getCurrentStepIndex = () => {
    if (!project) return 0;
    
    switch (project.status) {
      case 'planning': return project.sowId ? 2 : 1;
      case 'in_progress': return project.selectedQuoteId ? 6 : 4;
      case 'completed': return 6;
      default: return 0;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'in_progress': return 'primary';
      case 'on_hold': return 'warning';
      default: return 'default';
    }
  };

  const formatProjectType = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatAddress = (address: Project['propertyAddress']) => {
    return [address.line1, address.line2, address.city, address.postcode]
      .filter(Boolean)
      .join(', ');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error}
        </Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  // If no projectId, show dashboard with all projects
  if (!projectId) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          My Projects
        </Typography>
        
        {projects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No projects yet
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Start your home improvement journey by creating your first project
            </Typography>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate('/projects/create')}
            >
              Create Your First Project
            </Button>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {projects.map((proj) => (
              <Grid item xs={12} md={6} lg={4} key={proj.id}>
                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {proj.requirements?.description || 'Untitled Project'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {formatProjectType(proj.projectType)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {formatAddress(proj.propertyAddress)}
                    </Typography>
                    <Chip 
                      label={proj.status.replace('_', ' ').toUpperCase()} 
                      color={getStatusColor(proj.status) as any}
                      size="small"
                    />
                  </CardContent>
                  <CardActions>
                    <Button 
                      size="small" 
                      onClick={() => navigate(`/projects/${proj.id}`)}
                    >
                      View Details
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
        
        {projects.length > 0 && (
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Button 
              variant="contained" 
              onClick={() => navigate('/projects/create')}
            >
              Create New Project
            </Button>
          </Box>
        )}
      </Container>
    );
  }

  // Single project view
  if (!project) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Project not found
        </Alert>
        <Button onClick={() => navigate('/dashboard')} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const currentStep = getCurrentStepIndex();
  const progressPercentage = ((currentStep + 1) / projectSteps.length) * 100;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Project Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h3" component="h1" gutterBottom>
              {formatProjectType(project.projectType)} Project
            </Typography>
            <Typography variant="h6" color="text.secondary">
              {formatAddress(project.propertyAddress)}
            </Typography>
          </Box>
          <Chip 
            label={project.status.replace('_', ' ').toUpperCase()} 
            color={getStatusColor(project.status) as any}
            size="medium"
          />
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Project Progress: {Math.round(progressPercentage)}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage} 
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      </Box>

      {/* AI Guidance */}
      {nextStepGuidance && (
        <Alert severity="info" sx={{ mb: 4 }} icon={false}>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            💡 Next Steps Guidance:
          </Typography>
          <Typography variant="body2">
            {nextStepGuidance}
          </Typography>
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Project Progress */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Timeline
              </Typography>
              <Stepper 
                activeStep={currentStep} 
                orientation={isMobile ? 'vertical' : 'horizontal'}
                alternativeLabel={!isMobile}
              >
                {projectSteps.map((step, index) => (
                  <Step key={step.label} completed={index < currentStep}>
                    <StepLabel>
                      {step.label}
                    </StepLabel>
                    {isMobile && (
                      <StepContent>
                        <Typography variant="body2" color="text.secondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    )}
                  </Step>
                ))}
              </Stepper>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <List dense>
                {!project.sowId && (
                  <ListItem>
                    <ListItemIcon>
                      <AssignmentIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Generate Scope of Work"
                      secondary="AI will create detailed project specifications"
                    />
                  </ListItem>
                )}
                {project.sowId && !project.selectedQuoteId && (
                  <ListItem>
                    <ListItemIcon>
                      <PeopleIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Find Builders"
                      secondary="Share SoW with qualified builders"
                    />
                  </ListItem>
                )}
                <ListItem>
                  <ListItemIcon>
                    <DescriptionIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary="View Documents"
                    secondary={`${project.documents.length} files uploaded`}
                  />
                </ListItem>
              </List>
            </CardContent>
            <CardActions>
              <Button variant="contained" fullWidth>
                {!project.sowId ? 'Generate SoW' : 'View SoW'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Project Details */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Details
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Project Type"
                    secondary={formatProjectType(project.projectType)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Created"
                    secondary={new Date(project.createdAt).toLocaleDateString()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={new Date(project.updatedAt).toLocaleDateString()}
                  />
                </ListItem>
                {project.requirements.timeline && (
                  <ListItem>
                    <ListItemText
                      primary="Timeline"
                      secondary={project.requirements.timeline}
                    />
                  </ListItem>
                )}
                {project.requirements.budget && (
                  <ListItem>
                    <ListItemText
                      primary="Budget Range"
                      secondary={`£${project.requirements.budget.min?.toLocaleString()} - £${project.requirements.budget.max?.toLocaleString()}`}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Council Information */}
        {project.councilData && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Planning Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemText
                      primary="Local Authority"
                      secondary={project.councilData.localAuthority}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {project.councilData.conservationArea ? 
                        <WarningIcon color="warning" /> : 
                        <CheckIcon color="success" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary="Conservation Area"
                      secondary={project.councilData.conservationArea ? 'Yes - Additional restrictions apply' : 'No'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      {project.councilData.listedBuilding ? 
                        <WarningIcon color="warning" /> : 
                        <CheckIcon color="success" />
                      }
                    </ListItemIcon>
                    <ListItemText
                      primary="Listed Building"
                      secondary={project.councilData.listedBuilding ? 'Yes - Special permissions required' : 'No'}
                    />
                  </ListItem>
                </List>
                {project.councilData.planningRestrictions.length > 0 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Planning Restrictions:
                    </Typography>
                    {project.councilData.planningRestrictions.map((restriction, index) => (
                      <Typography key={index} variant="body2" sx={{ ml: 2 }}>
                        • {restriction}
                      </Typography>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Requirements Summary */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Project Requirements
              </Typography>
              <Typography variant="body1" paragraph>
                {project.requirements.description}
              </Typography>
              
              {project.requirements.materials && project.requirements.materials.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Material Preferences:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {project.requirements.materials.map((material, index) => (
                      <Chip key={index} label={material} variant="outlined" size="small" />
                    ))}
                  </Box>
                </Box>
              )}

              {project.requirements.specialRequirements && project.requirements.specialRequirements.length > 0 && (
                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Special Requirements:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {project.requirements.specialRequirements.map((requirement, index) => (
                      <Chip key={index} label={requirement} color="secondary" variant="outlined" size="small" />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProjectDashboardPage;