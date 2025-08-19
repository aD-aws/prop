import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  Alert,
} from '@mui/material';
import {
  Home as HomeIcon,
  Build as BuildIcon,
  Description as DescriptionIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';

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

interface ReviewStepProps {
  data: ProjectFormData;
  onChange: (data: Partial<ProjectFormData>) => void;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ data }) => {
  const formatProjectType = (type: string | undefined) => {
    if (!type) return 'Unknown';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatAddress = () => {
    const { line1, line2, city, postcode } = data.propertyAddress;
    return [line1, line2, city, postcode].filter(Boolean).join(', ');
  };

  const formatBudget = () => {
    if (!data.requirements.budget) return 'Not specified';
    const { min, max } = data.requirements.budget;
    if (min && max) {
      return `£${min.toLocaleString()} - £${max.toLocaleString()}`;
    } else if (min) {
      return `From £${min.toLocaleString()}`;
    } else if (max) {
      return `Up to £${max.toLocaleString()}`;
    }
    return 'Not specified';
  };

  const formatDimensions = () => {
    if (!data.requirements.dimensions) return 'Not specified';
    const { length, width, height } = data.requirements.dimensions;
    const dims = [];
    if (length) dims.push(`${length}m length`);
    if (width) dims.push(`${width}m width`);
    if (height) dims.push(`${height}m height`);
    return dims.length > 0 ? dims.join(' × ') : 'Not specified';
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Review Your Project Details
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Please review all the information below. Once you create the project, 
        our AI will analyze your requirements and generate a detailed Scope of Work.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 After creating your project, you'll be able to review and refine the AI-generated 
        Scope of Work before sharing it with builders.
      </Alert>

      <Grid container spacing={3}>
        {/* Property Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Property Information</Typography>
              </Box>
              <Typography variant="body1" gutterBottom>
                <strong>Address:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {formatAddress()}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Project Type */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BuildIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Project Type</Typography>
              </Box>
              <Chip 
                label={formatProjectType(data.projectType)} 
                color="primary" 
                size="medium"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Project Requirements */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <DescriptionIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Project Requirements</Typography>
              </Box>
              
              <Typography variant="body1" gutterBottom>
                <strong>Description:</strong>
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {data.requirements.description}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Timeline:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {data.requirements.timeline || 'Not specified'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Budget:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatBudget()}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Dimensions:</strong>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDimensions()}
                  </Typography>
                </Grid>
              </Grid>

              {data.requirements.materials && data.requirements.materials.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    <strong>Material Preferences:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.requirements.materials.map((material, index) => (
                      <Chip key={index} label={material} variant="outlined" size="small" />
                    ))}
                  </Box>
                </>
              )}

              {data.requirements.specialRequirements && data.requirements.specialRequirements.length > 0 && (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="body1" gutterBottom>
                    <strong>Special Requirements:</strong>
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {data.requirements.specialRequirements.map((requirement, index) => (
                      <Chip key={index} label={requirement} color="secondary" variant="outlined" size="small" />
                    ))}
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Documents */}
        {data.documents && data.documents.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AttachFileIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Uploaded Documents</Typography>
                </Box>
                <List dense>
                  {data.documents.map((file, index) => (
                    <ListItem key={index}>
                      <ListItemText
                        primary={file.name}
                        secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Next Steps */}
      <Alert severity="success" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          What happens next?
        </Typography>
        <Typography variant="body2">
          1. Our AI will analyze your requirements and create a detailed Scope of Work<br />
          2. You'll be able to review and refine the generated scope<br />
          3. Once approved, you can share it with qualified builders to get quotes<br />
          4. Compare quotes and select the best builder for your project
        </Typography>
      </Alert>
    </Box>
  );
};

export default ReviewStep;