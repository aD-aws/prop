import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  CircularProgress,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  FormHelperText,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../contexts/AuthContext';

const schema = yup.object({
  firstName: yup
    .string()
    .required('First name is required')
    .min(2, 'First name must be at least 2 characters'),
  lastName: yup
    .string()
    .required('Last name is required')
    .min(2, 'Last name must be at least 2 characters'),
  email: yup
    .string()
    .email('Please enter a valid email address')
    .required('Email is required'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Please confirm your password'),
  userType: yup
    .string()
    .oneOf(['homeowner', 'builder'], 'Please select a user type')
    .required('User type is required'),
  phone: yup
    .string()
    .matches(/^(\+44|0)[0-9]{10,11}$/, 'Please enter a valid UK phone number')
    .optional(),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], 'You must agree to the terms and conditions'),
  agreeToPrivacy: yup
    .boolean()
    .oneOf([true], 'You must agree to the privacy policy'),
});

interface RegisterFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  userType: 'homeowner' | 'builder';
  phone?: string;
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { register: registerUser } = useAuth();
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      userType: 'homeowner',
      agreeToTerms: false,
      agreeToPrivacy: false,
    },
  });

  const userType = watch('userType');

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');

    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        userType: data.userType,
        phone: data.phone,
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              Create Your Account
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Join thousands of UK homeowners planning their projects
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
              <TextField
                {...register('firstName')}
                fullWidth
                label="First Name"
                autoComplete="given-name"
                autoFocus
                error={!!errors.firstName}
                helperText={errors.firstName?.message}
              />
              <TextField
                {...register('lastName')}
                fullWidth
                label="Last Name"
                autoComplete="family-name"
                error={!!errors.lastName}
                helperText={errors.lastName?.message}
              />
            </Box>

            <TextField
              {...register('email')}
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              sx={{ mb: 3 }}
            />

            <TextField
              {...register('phone')}
              fullWidth
              label="Phone Number (Optional)"
              type="tel"
              autoComplete="tel"
              placeholder="+44 or 0..."
              error={!!errors.phone}
              helperText={errors.phone?.message || 'UK phone number format'}
              sx={{ mb: 3 }}
            />

            <FormControl component="fieldset" sx={{ mb: 3, width: '100%' }}>
              <FormLabel component="legend">I am a:</FormLabel>
              <Controller
                name="userType"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} row>
                    <FormControlLabel
                      value="homeowner"
                      control={<Radio />}
                      label="Homeowner"
                    />
                    <FormControlLabel
                      value="builder"
                      control={<Radio />}
                      label="Builder/Contractor"
                    />
                  </RadioGroup>
                )}
              />
              {errors.userType && (
                <FormHelperText error>{errors.userType.message}</FormHelperText>
              )}
            </FormControl>

            <TextField
              {...register('password')}
              fullWidth
              label="Password"
              type="password"
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              sx={{ mb: 3 }}
            />

            <TextField
              {...register('confirmPassword')}
              fullWidth
              label="Confirm Password"
              type="password"
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              sx={{ mb: 3 }}
            />

            <Box sx={{ mb: 3 }}>
              <Controller
                name="agreeToTerms"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} />}
                    label={
                      <Typography variant="body2">
                        I agree to the{' '}
                        <Link href="/terms" target="_blank" underline="hover">
                          Terms and Conditions
                        </Link>
                      </Typography>
                    }
                  />
                )}
              />
              {errors.agreeToTerms && (
                <FormHelperText error>{errors.agreeToTerms.message}</FormHelperText>
              )}

              <Controller
                name="agreeToPrivacy"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Checkbox {...field} />}
                    label={
                      <Typography variant="body2">
                        I agree to the{' '}
                        <Link href="/privacy" target="_blank" underline="hover">
                          Privacy Policy
                        </Link>{' '}
                        and consent to data processing
                      </Typography>
                    }
                  />
                )}
              />
              {errors.agreeToPrivacy && (
                <FormHelperText error>{errors.agreeToPrivacy.message}</FormHelperText>
              )}
            </Box>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 3, py: 1.5 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                `Create ${userType === 'homeowner' ? 'Homeowner' : 'Builder'} Account`
              )}
            </Button>

            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                OR
              </Typography>
            </Divider>

            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  component={RouterLink}
                  to="/login"
                  variant="body2"
                  underline="hover"
                  sx={{ fontWeight: 600 }}
                >
                  Sign in
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Link
          component={RouterLink}
          to="/"
          variant="body2"
          underline="hover"
          color="text.secondary"
        >
          ← Back to Home
        </Link>
      </Box>
    </Container>
  );
};

export default RegisterPage;