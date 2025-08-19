import React from 'react';
import {
  Box,
  Container,
  Typography,
  Link,
  Grid,
  useTheme,
} from '@mui/material';

const Footer: React.FC = () => {
  const theme = useTheme();

  return (
    <Box
      component="footer"
      sx={{
        backgroundColor: theme.palette.grey[100],
        py: 4,
        mt: 'auto',
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Platform
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/about" color="text.secondary" underline="hover">
                About Us
              </Link>
              <Link href="/how-it-works" color="text.secondary" underline="hover">
                How It Works
              </Link>
              <Link href="/pricing" color="text.secondary" underline="hover">
                Pricing
              </Link>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Support
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/help" color="text.secondary" underline="hover">
                Help Center
              </Link>
              <Link href="/contact" color="text.secondary" underline="hover">
                Contact Us
              </Link>
              <Link href="/faq" color="text.secondary" underline="hover">
                FAQ
              </Link>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Legal
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Link href="/privacy" color="text.secondary" underline="hover">
                Privacy Policy
              </Link>
              <Link href="/terms" color="text.secondary" underline="hover">
                Terms of Service
              </Link>
              <Link href="/cookies" color="text.secondary" underline="hover">
                Cookie Policy
              </Link>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Typography variant="h6" color="text.primary" gutterBottom>
              Standards
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                RICS Compliant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                RIBA Plan of Work
              </Typography>
              <Typography variant="body2" color="text.secondary">
                NRM1/NRM2 Standards
              </Typography>
              <Typography variant="body2" color="text.secondary">
                NHBC Guidelines
              </Typography>
            </Box>
          </Grid>
        </Grid>
        
        <Box
          sx={{
            borderTop: `1px solid ${theme.palette.divider}`,
            mt: 4,
            pt: 2,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            © 2024 UK Home Improvement Platform. All rights reserved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Built with AI-powered guidance for UK homeowners
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;