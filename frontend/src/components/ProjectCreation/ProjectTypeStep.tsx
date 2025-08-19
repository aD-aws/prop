import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  Home as HomeIcon,
  Kitchen as KitchenIcon,
  Bathtub as BathtubIcon,
  Stairs as StairsIcon,
  Build as BuildIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { projectService } from '../../services/projectService';

type ProjectType = 'loft_conversion' | 'extension' | 'renovation' | 'new_build' | 'other';

interface ProjectTypeStepProps {
  data: ProjectType;
  onChange: (projectType: ProjectType) => void;
}

interface ProjectTypeInfo {
  id: ProjectType;
  name: string;
  description: string;
  icon: React.ReactNode;
  estimatedDuration: string;
  estimatedCost: string;
  complexity: 'low' | 'medium' | 'high';
  requiresPlanning: boolean;
  commonFeatures: string[];
}

const ProjectTypeStep: React.FC<ProjectTypeStepProps> = ({ data, onChange }) => {
  const { getEducationalContent } = useAIAssistant();
  const [projectTypes, setProjectTypes] = useState<ProjectTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTypeInfo, setSelectedTypeInfo] = useState<ProjectTypeInfo | null>(null);
  const [educationalContent, setEducationalContent] = useState<string>('');
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);

  const defaultProjectTypes: ProjectTypeInfo[] = [
    {
      id: 'loft_conversion',
      name: 'Loft Conversion',
      description: 'Convert your loft space into a functional room such as a bedroom, office, or bathroom.',
      icon: <StairsIcon sx={{ fontSize: 40 }} />,
      estimatedDuration: '4-8 weeks',
      estimatedCost: '£15,000 - £60,000',
      complexity: 'medium',
      requiresPlanning: false,
      commonFeatures: ['Dormer windows', 'Velux windows', 'Insulation', 'Flooring', 'Staircase'],
    },
    {
      id: 'extension',
      name: 'Home Extension',
      description: 'Single or double-story extensions to expand your living space.',
      icon: <HomeIcon sx={{ fontSize: 40 }} />,
      estimatedDuration: '8-16 weeks',
      estimatedCost: '£20,000 - £80,000',
      complexity: 'high',
      requiresPlanning: true,
      commonFeatures: ['Foundation work', 'Structural work', 'Roofing', 'Windows & doors', 'Utilities'],
    },
    {
      id: 'renovation',
      name: 'Renovation',
      description: 'Complete refurbishment of existing rooms including kitchens and bathrooms.',
      icon: <KitchenIcon sx={{ fontSize: 40 }} />,
      estimatedDuration: '3-8 weeks',
      estimatedCost: '£5,000 - £40,000',
      complexity: 'low',
      requiresPlanning: false,
      commonFeatures: ['Plumbing', 'Electrical work', 'Tiling', 'Fixtures & fittings', 'Decoration'],
    },
    {
      id: 'new_build',
      name: 'New Build',
      description: 'Construction of a new property from foundation to completion.',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      estimatedDuration: '6-12 months',
      estimatedCost: '£100,000+',
      complexity: 'high',
      requiresPlanning: true,
      commonFeatures: ['Site preparation', 'Foundation', 'Structure', 'Services', 'Finishes'],
    },
    {
      id: 'other',
      name: 'Other',
      description: 'Custom project type - we\'ll help you define the specific requirements.',
      icon: <BuildIcon sx={{ fontSize: 40 }} />,
      estimatedDuration: 'Varies',
      estimatedCost: 'Varies',
      complexity: 'medium',
      requiresPlanning: false,
      commonFeatures: ['Custom requirements'],
    },
  ];

  useEffect(() => {
    const loadProjectTypes = async () => {
      try {
        const types = await projectService.getProjectTypes();
        // Map API response to our interface, fallback to defaults
        setProjectTypes(defaultProjectTypes);
      } catch (error) {
        console.error('Failed to load project types:', error);
        setProjectTypes(defaultProjectTypes);
      } finally {
        setLoading(false);
      }
    };

    loadProjectTypes();
  }, []);

  const handleProjectTypeSelect = (projectType: ProjectType) => {
    onChange(projectType);
  };

  const handleLearnMore = async (projectType: ProjectTypeInfo) => {
    setSelectedTypeInfo(projectType);
    setInfoDialogOpen(true);
    
    try {
      const content = await getEducationalContent(
        `${projectType.name} home improvement project`,
        'beginner'
      );
      setEducationalContent(content);
    } catch (error) {
      console.error('Failed to get educational content:', error);
      setEducationalContent('Educational content is temporarily unavailable. Please try again later.');
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'success';
      case 'medium': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        What type of project are you planning?
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Select the type of home improvement project you're planning. 
        We'll provide specific guidance and requirements for your chosen project type.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 Not sure which type fits your project? Click "Learn More" on any option to get detailed information and examples.
      </Alert>

      <Grid container spacing={3}>
        {projectTypes.map((projectType) => (
          <Grid item xs={12} sm={6} lg={4} key={projectType.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
                border: data === projectType.id ? 2 : 1,
                borderColor: data === projectType.id ? 'primary.main' : 'divider',
                '&:hover': {
                  boxShadow: 4,
                },
              }}
              onClick={() => handleProjectTypeSelect(projectType.id)}
            >
              <CardContent sx={{ flex: 1, textAlign: 'center' }}>
                <Box sx={{ color: 'primary.main', mb: 2 }}>
                  {projectType.icon}
                </Box>
                
                <Typography variant="h6" component="h3" gutterBottom>
                  {projectType.name}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {projectType.description}
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Duration:</strong> {projectType.estimatedDuration}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Estimated Cost:</strong> {projectType.estimatedCost}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                  <Chip
                    label={`${projectType.complexity} complexity`}
                    color={getComplexityColor(projectType.complexity) as any}
                    size="small"
                  />
                  {projectType.requiresPlanning && (
                    <Chip
                      label="Planning required"
                      color="warning"
                      size="small"
                    />
                  )}
                </Box>
              </CardContent>

              <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                <Button
                  size="small"
                  startIcon={<InfoIcon />}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLearnMore(projectType);
                  }}
                >
                  Learn More
                </Button>
                {data === projectType.id && (
                  <Chip label="Selected" color="primary" size="small" />
                )}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Educational Content Dialog */}
      <Dialog
        open={infoDialogOpen}
        onClose={() => setInfoDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTypeInfo?.name} - Detailed Information
        </DialogTitle>
        <DialogContent>
          {selectedTypeInfo && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedTypeInfo.description}
              </Typography>

              <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                Common Features:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
                {selectedTypeInfo.commonFeatures.map((feature, index) => (
                  <Chip key={index} label={feature} variant="outlined" size="small" />
                ))}
              </Box>

              <Typography variant="h6" gutterBottom>
                AI-Powered Guidance:
              </Typography>
              {educationalContent ? (
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                  {educationalContent}
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2">Loading detailed information...</Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInfoDialogOpen(false)}>
            Close
          </Button>
          {selectedTypeInfo && (
            <Button
              variant="contained"
              onClick={() => {
                handleProjectTypeSelect(selectedTypeInfo.id);
                setInfoDialogOpen(false);
              }}
            >
              Select This Type
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProjectTypeStep;