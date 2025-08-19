import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Help as HelpIcon,
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useAIAssistant } from '../../contexts/AIAssistantContext';

type ProjectType = 'loft_conversion' | 'extension' | 'renovation' | 'new_build' | 'other';

interface Requirements {
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
}

interface RequirementsStepProps {
  data: Requirements;
  projectType: ProjectType;
  onChange: (requirements: Requirements) => void;
}

const RequirementsStep: React.FC<RequirementsStepProps> = ({ data, projectType, onChange }) => {
  const { getExplanation, getGuidance } = useAIAssistant();
  const [helpText, setHelpText] = useState<string>('');
  const [newMaterial, setNewMaterial] = useState('');
  const [newRequirement, setNewRequirement] = useState('');

  const timelineOptions = [
    'ASAP',
    'Within 1 month',
    'Within 3 months',
    'Within 6 months',
    'Within 1 year',
    'Flexible timing',
  ];

  const commonMaterials = {
    loft_conversion: ['Insulation', 'Plasterboard', 'Flooring', 'Velux windows', 'Dormer materials'],
    extension: ['Bricks', 'Concrete', 'Steel beams', 'Roof tiles', 'Windows', 'Doors'],
    renovation: ['Tiles', 'Paint', 'Fixtures', 'Flooring', 'Lighting'],
    new_build: ['Foundation materials', 'Structural steel', 'Roofing', 'Cladding', 'Insulation'],
    other: ['Standard building materials'],
  };

  const handleFieldChange = (field: keyof Requirements, value: any) => {
    onChange({ ...data, [field]: value });
  };

  const handleDimensionChange = (dimension: 'length' | 'width' | 'height', value: string) => {
    const numValue = parseFloat(value) || undefined;
    onChange({
      ...data,
      dimensions: {
        ...data.dimensions,
        [dimension]: numValue,
      },
    });
  };

  const handleBudgetChange = (type: 'min' | 'max', value: string) => {
    const numValue = parseFloat(value) || 0;
    onChange({
      ...data,
      budget: {
        ...data.budget,
        [type]: numValue,
      },
    });
  };

  const addMaterial = (material: string) => {
    if (material && !data.materials?.includes(material)) {
      onChange({
        ...data,
        materials: [...(data.materials || []), material],
      });
    }
    setNewMaterial('');
  };

  const removeMaterial = (material: string) => {
    onChange({
      ...data,
      materials: data.materials?.filter(m => m !== material) || [],
    });
  };

  const addSpecialRequirement = (requirement: string) => {
    if (requirement && !data.specialRequirements?.includes(requirement)) {
      onChange({
        ...data,
        specialRequirements: [...(data.specialRequirements || []), requirement],
      });
    }
    setNewRequirement('');
  };

  const removeSpecialRequirement = (requirement: string) => {
    onChange({
      ...data,
      specialRequirements: data.specialRequirements?.filter(r => r !== requirement) || [],
    });
  };

  const handleGetHelp = async (topic: string) => {
    try {
      const explanation = await getExplanation(topic);
      setHelpText(explanation);
    } catch (error) {
      console.error('Failed to get help:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Project Requirements
        </Typography>
        <Tooltip title="Get help with project requirements">
          <IconButton 
            size="small" 
            onClick={() => handleGetHelp(`${projectType} project requirements`)}
            sx={{ ml: 1 }}
          >
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Provide detailed information about what you want to achieve with your project. 
        The more specific you are, the more accurate your Scope of Work will be.
      </Typography>

      {helpText && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setHelpText('')}>
          {helpText}
        </Alert>
      )}

      {/* Project Description */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="Project Description"
          placeholder="Describe what you want to achieve with this project. Include any specific features, style preferences, or functional requirements..."
          value={data.description}
          onChange={(e) => handleFieldChange('description', e.target.value)}
          required
          helperText="Be as detailed as possible - this helps our AI create a more accurate scope of work"
        />
      </Box>

      {/* Dimensions */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Dimensions (Optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Length (meters)"
                type="number"
                value={data.dimensions?.length || ''}
                onChange={(e) => handleDimensionChange('length', e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Width (meters)"
                type="number"
                value={data.dimensions?.width || ''}
                onChange={(e) => handleDimensionChange('width', e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Height (meters)"
                type="number"
                value={data.dimensions?.height || ''}
                onChange={(e) => handleDimensionChange('height', e.target.value)}
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Timeline */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth>
          <InputLabel>Preferred Timeline</InputLabel>
          <Select
            value={data.timeline || ''}
            label="Preferred Timeline"
            onChange={(e) => handleFieldChange('timeline', e.target.value)}
          >
            {timelineOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Budget */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Budget Range (Optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Minimum Budget (£)"
                type="number"
                value={data.budget?.min || ''}
                onChange={(e) => handleBudgetChange('min', e.target.value)}
                inputProps={{ min: 0 }}
                helperText="Your minimum budget for this project"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Maximum Budget (£)"
                type="number"
                value={data.budget?.max || ''}
                onChange={(e) => handleBudgetChange('max', e.target.value)}
                inputProps={{ min: 0 }}
                helperText="Your maximum budget for this project"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Materials */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Material Preferences (Optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Common materials for {projectType.replace('_', ' ')} projects:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {commonMaterials[projectType].map((material) => (
                <Chip
                  key={material}
                  label={material}
                  onClick={() => addMaterial(material)}
                  variant={data.materials?.includes(material) ? 'filled' : 'outlined'}
                  color={data.materials?.includes(material) ? 'primary' : 'default'}
                  clickable
                />
              ))}
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Add custom material"
              value={newMaterial}
              onChange={(e) => setNewMaterial(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addMaterial(newMaterial);
                }
              }}
            />
            <IconButton onClick={() => addMaterial(newMaterial)}>
              <AddIcon />
            </IconButton>
          </Box>

          {data.materials && data.materials.length > 0 && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Selected materials:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.materials.map((material) => (
                  <Chip
                    key={material}
                    label={material}
                    onDelete={() => removeMaterial(material)}
                    color="primary"
                  />
                ))}
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Special Requirements */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Special Requirements (Optional)</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <TextField
              fullWidth
              label="Add special requirement"
              placeholder="e.g., Accessibility features, Energy efficiency, Specific building standards"
              value={newRequirement}
              onChange={(e) => setNewRequirement(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  addSpecialRequirement(newRequirement);
                }
              }}
            />
            <IconButton onClick={() => addSpecialRequirement(newRequirement)}>
              <AddIcon />
            </IconButton>
          </Box>

          {data.specialRequirements && data.specialRequirements.length > 0 && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Special requirements:
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {data.specialRequirements.map((requirement) => (
                  <Chip
                    key={requirement}
                    label={requirement}
                    onDelete={() => removeSpecialRequirement(requirement)}
                    color="secondary"
                  />
                ))}
              </Box>
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default RequirementsStep;