import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { builderService, Quote, QuoteSubmission } from '../services/builderService';

const QuoteDetailsPage: React.FC = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  
  const [quote, setQuote] = useState<(Quote & QuoteSubmission) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (quoteId) {
      loadQuoteDetails();
    }
  }, [quoteId]);

  const loadQuoteDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const quoteData = await builderService.getQuoteDetails(quoteId!);
      setQuote(quoteData);
    } catch (err) {
      setError('Failed to load quote details. Please try again.');
      console.error('Quote details load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawQuote = async () => {
    if (!quote) return;
    
    const reason = prompt('Please provide a reason for withdrawing this quote:');
    if (!reason) return;

    try {
      await builderService.withdrawQuote(quote.id, reason);
      navigate('/builder/dashboard', { 
        state: { message: 'Quote withdrawn successfully.' }
      });
    } catch (err) {
      setError('Failed to withdraw quote. Please try again.');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'primary';
      case 'selected': return 'success';
      case 'rejected': return 'error';
      case 'expired': return 'warning';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !quote) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Quote not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Quote Details
        </Typography>
        <Box display="flex" gap={2}>
          {quote.status === 'draft' && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => navigate(`/builder/quotes/${quote.id}/edit`)}
            >
              Edit Quote
            </Button>
          )}
          {(quote.status === 'draft' || quote.status === 'submitted') && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<DeleteIcon />}
              onClick={handleWithdrawQuote}
            >
              Withdraw Quote
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => {/* Download PDF */}}
          >
            Download PDF
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Quote Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Typography variant="h5" gutterBottom>
                  Quote Overview
                </Typography>
                <Chip 
                  label={quote.status.toUpperCase()} 
                  color={getStatusColor(quote.status) as any}
                  size="medium"
                />
              </Box>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Project:</strong> {quote.projectTitle}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Quote ID:</strong> {quote.id}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Total Amount:</strong> {formatCurrency(quote.totalPrice)}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Timeline:</strong> {quote.timeline} days
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1" gutterBottom>
                    <strong>Start Date:</strong> {new Date(quote.startDate).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Submitted:</strong> {new Date(quote.submittedAt).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Valid Until:</strong> {new Date(quote.validUntil).toLocaleDateString()}
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Warranty:</strong> {quote.warranty.duration} months
                  </Typography>
                </Grid>
              </Grid>

              {quote.clientResponse && (
                <Box mt={3} p={2} bgcolor="grey.50" borderRadius={1}>
                  <Typography variant="h6" gutterBottom>
                    Client Response
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    <strong>Status:</strong> {quote.clientResponse.status}
                  </Typography>
                  {quote.clientResponse.message && (
                    <Typography variant="body1" gutterBottom>
                      <strong>Message:</strong> {quote.clientResponse.message}
                    </Typography>
                  )}
                  {quote.clientResponse.respondedAt && (
                    <Typography variant="body2" color="text.secondary">
                      Responded on: {new Date(quote.clientResponse.respondedAt).toLocaleDateString()}
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quote Breakdown */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Quote Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell align="right">Unit Price</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Notes</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {quote.breakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell align="right">{item.quantity}</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice)}</TableCell>
                        <TableCell align="right">{formatCurrency(item.totalPrice)}</TableCell>
                        <TableCell>
                          <Chip label={item.methodology} size="small" />
                        </TableCell>
                        <TableCell>{item.notes || '-'}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5}><strong>Total Quote Amount</strong></TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(quote.totalPrice)}</strong>
                      </TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Warranty & Insurance */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Warranty & Insurance
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Warranty Details
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Duration:</strong> {quote.warranty.duration} months
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Coverage:</strong> {quote.warranty.coverage}
              </Typography>
              <Typography variant="body2" paragraph>
                <strong>Terms:</strong> {quote.warranty.terms}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Insurance Coverage
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Public Liability:</strong> £{quote.insurance.publicLiability.toLocaleString()}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Employers Liability:</strong> £{quote.insurance.employersLiability.toLocaleString()}
              </Typography>
              {quote.insurance.professionalIndemnity && (
                <Typography variant="body1" gutterBottom>
                  <strong>Professional Indemnity:</strong> £{quote.insurance.professionalIndemnity.toLocaleString()}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Certifications & Terms */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Certifications & Terms
              </Typography>
              
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Professional Certifications
              </Typography>
              <List dense>
                {quote.certifications.map((cert, index) => (
                  <ListItem key={index}>
                    <ListItemText primary={cert} />
                  </ListItem>
                ))}
              </List>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Terms & Conditions
              </Typography>
              <Typography variant="body2" paragraph>
                {quote.terms}
              </Typography>

              {quote.additionalNotes && (
                <>
                  <Typography variant="h6" gutterBottom>
                    Additional Notes
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {quote.additionalNotes}
                  </Typography>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default QuoteDetailsPage;