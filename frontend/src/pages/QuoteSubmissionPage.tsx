import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Send as SendIcon,
  Preview as PreviewIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useParams, useNavigate } from 'react-router-dom';
import { builderService, SoWDetails, QuoteSubmission } from '../services/builderService';

interface QuoteBreakdownItem {
  category: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  methodology: 'NRM1' | 'NRM2';
  notes?: string;
}

const steps = [
  'Quote Breakdown',
  'Timeline & Warranty',
  'Certifications & Insurance',
  'Terms & Review',
];

const QuoteSubmissionPage: React.FC = () => {
  const { sowId } = useParams<{ sowId: string }>();
  const navigate = useNavigate();
  
  const [sowDetails, setSowDetails] = useState<SoWDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  // Quote form state
  const [quoteData, setQuoteData] = useState<QuoteSubmission>({
    sowId: sowId || '',
    totalPrice: 0,
    breakdown: [],
    timeline: 0,
    startDate: '',
    warranty: {
      duration: 12,
      coverage: '',
      terms: '',
    },
    certifications: [],
    insurance: {
      publicLiability: 0,
      employersLiability: 0,
      professionalIndemnity: 0,
    },
    terms: '',
    validUntil: '',
    additionalNotes: '',
  });

  // Dialog states
  const [breakdownDialogOpen, setBreakdownDialogOpen] = useState(false);
  const [editingBreakdownIndex, setEditingBreakdownIndex] = useState<number | null>(null);
  const [newBreakdownItem, setNewBreakdownItem] = useState<QuoteBreakdownItem>({
    category: '',
    description: '',
    quantity: 1,
    unit: 'item',
    unitPrice: 0,
    totalPrice: 0,
    methodology: 'NRM2',
    notes: '',
  });

  useEffect(() => {
    if (sowId) {
      loadSoWDetails();
    }
  }, [sowId]);

  useEffect(() => {
    // Calculate total price when breakdown changes
    const total = quoteData.breakdown.reduce((sum, item) => sum + item.totalPrice, 0);
    setQuoteData(prev => ({ ...prev, totalPrice: total }));
  }, [quoteData.breakdown]);

  useEffect(() => {
    // Calculate total price for breakdown item
    const total = newBreakdownItem.quantity * newBreakdownItem.unitPrice;
    setNewBreakdownItem(prev => ({ ...prev, totalPrice: total }));
  }, [newBreakdownItem.quantity, newBreakdownItem.unitPrice]);

  const loadSoWDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await builderService.getSoWDetails(sowId!);
      setSowDetails(details);
      
      // Set default valid until date (30 days from now)
      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 30);
      
      setQuoteData(prev => ({
        ...prev,
        validUntil: validUntil.toISOString().split('T')[0],
      }));
    } catch (err) {
      setError('Failed to load SoW details. Please try again.');
      console.error('SoW details load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleAddBreakdownItem = () => {
    if (editingBreakdownIndex !== null) {
      // Editing existing item
      const updatedBreakdown = [...quoteData.breakdown];
      updatedBreakdown[editingBreakdownIndex] = newBreakdownItem;
      setQuoteData(prev => ({ ...prev, breakdown: updatedBreakdown }));
      setEditingBreakdownIndex(null);
    } else {
      // Adding new item
      setQuoteData(prev => ({
        ...prev,
        breakdown: [...prev.breakdown, newBreakdownItem],
      }));
    }
    
    setNewBreakdownItem({
      category: '',
      description: '',
      quantity: 1,
      unit: 'item',
      unitPrice: 0,
      totalPrice: 0,
      methodology: 'NRM2',
      notes: '',
    });
    setBreakdownDialogOpen(false);
  };

  const handleEditBreakdownItem = (index: number) => {
    setNewBreakdownItem(quoteData.breakdown[index]);
    setEditingBreakdownIndex(index);
    setBreakdownDialogOpen(true);
  };

  const handleDeleteBreakdownItem = (index: number) => {
    const updatedBreakdown = quoteData.breakdown.filter((_, i) => i !== index);
    setQuoteData(prev => ({ ...prev, breakdown: updatedBreakdown }));
  };

  const handleSubmitQuote = async () => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate required fields
      if (quoteData.breakdown.length === 0) {
        setError('Please add at least one breakdown item.');
        return;
      }
      
      if (!quoteData.timeline || !quoteData.startDate) {
        setError('Please provide timeline and start date.');
        return;
      }

      await builderService.submitQuote(quoteData);
      navigate('/builder/dashboard', { 
        state: { message: 'Quote submitted successfully!' }
      });
    } catch (err) {
      setError('Failed to submit quote. Please try again.');
      console.error('Quote submission error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error && !sowDetails) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'SoW not found'}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Submit Quote
        </Typography>
        <Button
          variant="outlined"
          onClick={() => navigate(`/builder/sow/${sowId}`)}
        >
          View SoW Details
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {sowDetails && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Project Overview
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="body2">
                  <strong>Project ID:</strong> {sowDetails.projectId}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2">
                  <strong>Estimated Cost:</strong> {formatCurrency(sowDetails.costEstimate.totalCost)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="body2">
                  <strong>Your Quote:</strong> {formatCurrency(quoteData.totalPrice)}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Stepper activeStep={activeStep} orientation="vertical">
        {/* Step 1: Quote Breakdown */}
        <Step>
          <StepLabel>
            <Box display="flex" alignItems="center">
              <MoneyIcon sx={{ mr: 1 }} />
              Quote Breakdown (NRM2 Standards)
            </Box>
          </StepLabel>
          <StepContent>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Itemized Quote Breakdown
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setBreakdownDialogOpen(true)}
                  >
                    Add Item
                  </Button>
                </Box>

                {quoteData.breakdown.length > 0 ? (
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
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {quoteData.breakdown.map((item, index) => (
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
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditBreakdownItem(index)}
                              >
                                <PreviewIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteBreakdownItem(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow>
                          <TableCell colSpan={5}><strong>Total Quote Amount</strong></TableCell>
                          <TableCell align="right">
                            <strong>{formatCurrency(quoteData.totalPrice)}</strong>
                          </TableCell>
                          <TableCell colSpan={2}></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No breakdown items added yet. Click "Add Item" to start building your quote.
                  </Alert>
                )}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={quoteData.breakdown.length === 0}
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </StepContent>
        </Step>

        {/* Step 2: Timeline & Warranty */}
        <Step>
          <StepLabel>
            <Box display="flex" alignItems="center">
              <ScheduleIcon sx={{ mr: 1 }} />
              Timeline & Warranty
            </Box>
          </StepLabel>
          <StepContent>
            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Project Timeline (days)"
                      type="number"
                      value={quoteData.timeline}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        timeline: parseInt(e.target.value) || 0 
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Proposed Start Date"
                      type="date"
                      value={quoteData.startDate}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        startDate: e.target.value 
                      }))}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Warranty Duration (months)"
                      type="number"
                      value={quoteData.warranty.duration}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        warranty: { 
                          ...prev.warranty, 
                          duration: parseInt(e.target.value) || 0 
                        }
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Warranty Coverage"
                      value={quoteData.warranty.coverage}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        warranty: { 
                          ...prev.warranty, 
                          coverage: e.target.value 
                        }
                      }))}
                      placeholder="e.g., All workmanship and materials, structural defects..."
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Warranty Terms & Conditions"
                      value={quoteData.warranty.terms}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        warranty: { 
                          ...prev.warranty, 
                          terms: e.target.value 
                        }
                      }))}
                      placeholder="Detailed warranty terms and conditions..."
                      required
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!quoteData.timeline || !quoteData.startDate || !quoteData.warranty.coverage}
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </StepContent>
        </Step>

        {/* Step 3: Certifications & Insurance */}
        <Step>
          <StepLabel>
            <Box display="flex" alignItems="center">
              <SecurityIcon sx={{ mr: 1 }} />
              Certifications & Insurance
            </Box>
          </StepLabel>
          <StepContent>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Professional Certifications
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Relevant Certifications"
                  value={quoteData.certifications.join(', ')}
                  onChange={(e) => setQuoteData(prev => ({ 
                    ...prev, 
                    certifications: e.target.value.split(', ').filter(cert => cert.trim())
                  }))}
                  placeholder="e.g., RICS, NHBC, Gas Safe, NICEIC..."
                  sx={{ mb: 3 }}
                />

                <Typography variant="h6" gutterBottom>
                  Insurance Coverage
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Public Liability (£)"
                      type="number"
                      value={quoteData.insurance.publicLiability}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        insurance: { 
                          ...prev.insurance, 
                          publicLiability: parseInt(e.target.value) || 0 
                        }
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Employers Liability (£)"
                      type="number"
                      value={quoteData.insurance.employersLiability}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        insurance: { 
                          ...prev.insurance, 
                          employersLiability: parseInt(e.target.value) || 0 
                        }
                      }))}
                      required
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Professional Indemnity (£)"
                      type="number"
                      value={quoteData.insurance.professionalIndemnity}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        insurance: { 
                          ...prev.insurance, 
                          professionalIndemnity: parseInt(e.target.value) || 0 
                        }
                      }))}
                    />
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!quoteData.insurance.publicLiability || !quoteData.insurance.employersLiability}
                  >
                    Next
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </StepContent>
        </Step>

        {/* Step 4: Terms & Review */}
        <Step>
          <StepLabel>
            <Box display="flex" alignItems="center">
              <AssignmentIcon sx={{ mr: 1 }} />
              Terms & Review
            </Box>
          </StepLabel>
          <StepContent>
            <Card>
              <CardContent>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="Quote Valid Until"
                      type="date"
                      value={quoteData.validUntil}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        validUntil: e.target.value 
                      }))}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={4}
                      label="Terms & Conditions"
                      value={quoteData.terms}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        terms: e.target.value 
                      }))}
                      placeholder="Payment terms, variations, exclusions, etc..."
                      required
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Additional Notes (Optional)"
                      value={quoteData.additionalNotes}
                      onChange={(e) => setQuoteData(prev => ({ 
                        ...prev, 
                        additionalNotes: e.target.value 
                      }))}
                      placeholder="Any additional information or clarifications..."
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Quote Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body1">
                      <strong>Total Amount:</strong> {formatCurrency(quoteData.totalPrice)}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Timeline:</strong> {quoteData.timeline} days
                    </Typography>
                    <Typography variant="body1">
                      <strong>Warranty:</strong> {quoteData.warranty.duration} months
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body1">
                      <strong>Start Date:</strong> {new Date(quoteData.startDate).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Valid Until:</strong> {new Date(quoteData.validUntil).toLocaleDateString()}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Breakdown Items:</strong> {quoteData.breakdown.length}
                    </Typography>
                  </Grid>
                </Grid>

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                  <Button onClick={handleBack}>
                    Back
                  </Button>
                  <Box display="flex" gap={2}>
                    <Button
                      variant="outlined"
                      startIcon={<SaveIcon />}
                      onClick={() => {/* Save as draft */}}
                    >
                      Save Draft
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<SendIcon />}
                      onClick={handleSubmitQuote}
                      disabled={submitting || !quoteData.terms || !quoteData.validUntil}
                    >
                      {submitting ? <CircularProgress size={20} /> : 'Submit Quote'}
                    </Button>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </StepContent>
        </Step>
      </Stepper>

      {/* Breakdown Item Dialog */}
      <Dialog 
        open={breakdownDialogOpen} 
        onClose={() => setBreakdownDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingBreakdownIndex !== null ? 'Edit' : 'Add'} Breakdown Item
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Category"
                  value={newBreakdownItem.category}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    category: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Methodology</InputLabel>
                  <Select
                    value={newBreakdownItem.methodology}
                    label="Methodology"
                    onChange={(e) => setNewBreakdownItem(prev => ({ 
                      ...prev, 
                      methodology: e.target.value as 'NRM1' | 'NRM2'
                    }))}
                  >
                    <MenuItem value="NRM1">NRM1 (Order of Cost)</MenuItem>
                    <MenuItem value="NRM2">NRM2 (Detailed Measurement)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Description"
                  value={newBreakdownItem.description}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Quantity"
                  type="number"
                  value={newBreakdownItem.quantity}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    quantity: parseFloat(e.target.value) || 0 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Unit"
                  value={newBreakdownItem.unit}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    unit: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  fullWidth
                  label="Unit Price (£)"
                  type="number"
                  value={newBreakdownItem.unitPrice}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    unitPrice: parseFloat(e.target.value) || 0 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Total Price"
                  value={formatCurrency(newBreakdownItem.totalPrice)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Notes (Optional)"
                  value={newBreakdownItem.notes}
                  onChange={(e) => setNewBreakdownItem(prev => ({ 
                    ...prev, 
                    notes: e.target.value 
                  }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBreakdownDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddBreakdownItem}
            variant="contained"
            disabled={!newBreakdownItem.category || !newBreakdownItem.description || !newBreakdownItem.quantity || !newBreakdownItem.unitPrice}
          >
            {editingBreakdownIndex !== null ? 'Update' : 'Add'} Item
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default QuoteSubmissionPage;