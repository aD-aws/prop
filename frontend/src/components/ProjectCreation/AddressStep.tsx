import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Help as HelpIcon, CheckCircle as CheckIcon } from '@mui/icons-material';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { projectService } from '../../services/projectService';

interface Address {
  line1: string;
  line2?: string;
  city: string;
  postcode: string;
  country: string;
}

interface AddressStepProps {
  data: Address;
  onChange: (address: Address) => void;
}

const AddressStep: React.FC<AddressStepProps> = ({ data, onChange }) => {
  const { getExplanation } = useAIAssistant();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    suggestions?: Address[];
    councilData?: any;
  } | null>(null);
  const [helpText, setHelpText] = useState<string>('');

  useEffect(() => {
    // Validate address when postcode is complete
    if (data.postcode.length >= 6) {
      validateAddress();
    }
  }, [data.postcode]);

  const validateAddress = async () => {
    setIsValidating(true);
    try {
      const result = await projectService.validateAddress(data);
      setValidationResult(result);
    } catch (error) {
      console.error('Address validation failed:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFieldChange = (field: keyof Address, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const handleGetHelp = async (topic: string) => {
    try {
      const explanation = await getExplanation(topic);
      setHelpText(explanation);
    } catch (error) {
      console.error('Failed to get help:', error);
    }
  };

  const selectSuggestion = (suggestion: Address) => {
    onChange(suggestion);
    setValidationResult({ ...validationResult!, isValid: true });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          Property Address
        </Typography>
        <Tooltip title="Get help with address requirements">
          <IconButton 
            size="small" 
            onClick={() => handleGetHelp('UK property address requirements')}
            sx={{ ml: 1 }}
          >
            <HelpIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Typography variant="body1" color="text.secondary" paragraph>
        Enter the address of the property where the work will be carried out. 
        We'll check for any planning restrictions or conservation area requirements.
      </Typography>

      {helpText && (
        <Alert severity="info" sx={{ mb: 3 }} onClose={() => setHelpText('')}>
          {helpText}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 1"
            placeholder="e.g., 123 High Street"
            value={data.line1}
            onChange={(e) => handleFieldChange('line1', e.target.value)}
            required
            helperText="House number and street name"
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Address Line 2 (Optional)"
            placeholder="e.g., Apartment 4B, Building name"
            value={data.line2 || ''}
            onChange={(e) => handleFieldChange('line2', e.target.value)}
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="City/Town"
            placeholder="e.g., London"
            value={data.city}
            onChange={(e) => handleFieldChange('city', e.target.value)}
            required
          />
        </Grid>

        <Grid item xs={12} sm={6}>
          <Box sx={{ position: 'relative' }}>
            <TextField
              fullWidth
              label="Postcode"
              placeholder="e.g., SW1A 1AA"
              value={data.postcode}
              onChange={(e) => handleFieldChange('postcode', e.target.value.toUpperCase())}
              required
              InputProps={{
                endAdornment: isValidating ? (
                  <CircularProgress size={20} />
                ) : validationResult?.isValid ? (
                  <CheckIcon color="success" />
                ) : null,
              }}
              helperText="UK postcode format"
            />
          </Box>
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Country"
            value={data.country}
            onChange={(e) => handleFieldChange('country', e.target.value)}
            disabled
            helperText="Currently supporting UK properties only"
          />
        </Grid>
      </Grid>

      {/* Address Suggestions */}
      {validationResult?.suggestions && validationResult.suggestions.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Did you mean one of these addresses?
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {validationResult.suggestions.map((suggestion, index) => (
              <Chip
                key={index}
                label={`${suggestion.line1}, ${suggestion.city}, ${suggestion.postcode}`}
                onClick={() => selectSuggestion(suggestion)}
                variant="outlined"
                clickable
                sx={{ justifyContent: 'flex-start', height: 'auto', py: 1 }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Council Data Display */}
      {validationResult?.councilData && (
        <Box sx={{ mt: 3 }}>
          <Alert 
            severity={validationResult.councilData.conservationArea || validationResult.councilData.listedBuilding ? 'warning' : 'info'}
          >
            <Typography variant="subtitle2" gutterBottom>
              Property Information:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {validationResult.councilData.conservationArea && (
                <Chip 
                  label="Conservation Area" 
                  color="warning" 
                  size="small" 
                />
              )}
              {validationResult.councilData.listedBuilding && (
                <Chip 
                  label="Listed Building" 
                  color="warning" 
                  size="small" 
                />
              )}
              <Chip 
                label={`Local Authority: ${validationResult.councilData.localAuthority}`} 
                variant="outlined" 
                size="small" 
              />
            </Box>
            {(validationResult.councilData.conservationArea || validationResult.councilData.listedBuilding) && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Additional planning permissions may be required for this property.
              </Typography>
            )}
          </Alert>
        </Box>
      )}

      {/* Validation Error */}
      {validationResult && !validationResult.isValid && !validationResult.suggestions && (
        <Alert severity="error" sx={{ mt: 3 }}>
          We couldn't validate this address. Please check the postcode and try again, 
          or contact us if you believe this is an error.
        </Alert>
      )}
    </Box>
  );
};

export default AddressStep;