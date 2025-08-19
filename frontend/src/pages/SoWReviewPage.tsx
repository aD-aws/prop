import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  QuestionAnswer as QuestionIcon,
  Assignment as AssignmentIcon,
  Build as BuildIcon,
  AttachMoney as MoneyIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { builderService, SoWDetails, ClarificationQuestion } from '../services/builderService';

const SoWReviewPage: React.FC = () => {
  const { sowId } = useParams<{ sowId: string }>();
  const navigate = useNavigate();
  
  const [sowDetails, setSowDetails] = useState<SoWDetails | null>(null);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Question dialog state
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    category: 'technical' as ClarificationQuestion['category'],
  });
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    if (sowId) {
      loadSoWDetails();
      loadQuestions();
    }
  }, [sowId]);

  const loadSoWDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await builderService.getSoWDetails(sowId!);
      setSowDetails(details);
    } catch (err) {
      setError('Failed to load SoW details. Please try again.');
      console.error('SoW details load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      const questionsData = await builderService.getClarificationQuestions(sowId!);
      setQuestions(questionsData);
    } catch (err) {
      console.error('Questions load error:', err);
    }
  };

  const handleAskQuestion = async () => {
    if (!newQuestion.question.trim()) return;

    try {
      setSubmittingQuestion(true);
      await builderService.askClarificationQuestion(sowId!, newQuestion);
      setQuestionDialogOpen(false);
      setNewQuestion({ question: '', category: 'technical' });
      loadQuestions(); // Reload questions
    } catch (err) {
      setError('Failed to submit question. Please try again.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getComplianceIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <CheckCircleIcon color="success" />;
      case 'requires_attention': return <WarningIcon color="warning" />;
      default: return <InfoIcon color="info" />;
    }
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant': return 'success';
      case 'requires_attention': return 'warning';
      default: return 'info';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !sowDetails) {
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
          Scope of Work Review
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<QuestionIcon />}
            onClick={() => setQuestionDialogOpen(true)}
          >
            Ask Question
          </Button>
          <Button
            variant="contained"
            startIcon={<AssignmentIcon />}
            onClick={() => navigate(`/builder/quote/${sowId}`)}
          >
            Submit Quote
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Project Overview */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Project Overview
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1">
                    <strong>Project ID:</strong> {sowDetails.projectId}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Version:</strong> {sowDetails.version}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body1">
                    <strong>Total Estimated Cost:</strong> {formatCurrency(sowDetails.costEstimate.totalCost)}
                  </Typography>
                  <Typography variant="body1">
                    <strong>Confidence Level:</strong> {sowDetails.costEstimate.confidence}%
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* RIBA Stages */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <ScheduleIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                RIBA Plan of Work Stages
              </Typography>
              {sowDetails.ribaStages.map((stage) => (
                <Accordion key={stage.stage}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">
                      Stage {stage.stage}: {stage.title}
                    </Typography>
                    <Chip 
                      label={`${stage.duration} days`} 
                      size="small" 
                      sx={{ ml: 2 }}
                    />
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body1" paragraph>
                      {stage.description}
                    </Typography>
                    
                    <Typography variant="h6" gutterBottom>
                      Deliverables:
                    </Typography>
                    <List dense>
                      {stage.deliverables.map((deliverable, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            <CheckCircleIcon color="primary" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText primary={deliverable} />
                        </ListItem>
                      ))}
                    </List>

                    {stage.dependencies.length > 0 && (
                      <>
                        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                          Dependencies:
                        </Typography>
                        <List dense>
                          {stage.dependencies.map((dependency, index) => (
                            <ListItem key={index}>
                              <ListItemIcon>
                                <InfoIcon color="info" fontSize="small" />
                              </ListItemIcon>
                              <ListItemText primary={dependency} />
                            </ListItem>
                          ))}
                        </List>
                      </>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Specifications */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Technical Specifications
              </Typography>
              {sowDetails.specifications.map((spec, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{spec.category}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Specification</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {spec.items.map((item, itemIndex) => (
                            <TableRow key={itemIndex}>
                              <TableCell>{item.description}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>{item.specification}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Materials */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <DescriptionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Materials List
              </Typography>
              {sowDetails.materials.map((material, index) => (
                <Accordion key={index}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6">{material.category}</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Material</TableCell>
                            <TableCell>Specification</TableCell>
                            <TableCell align="right">Quantity</TableCell>
                            <TableCell>Unit</TableCell>
                            <TableCell>Preferred Suppliers</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {material.items.map((item, itemIndex) => (
                            <TableRow key={itemIndex}>
                              <TableCell>{item.name}</TableCell>
                              <TableCell>{item.specification}</TableCell>
                              <TableCell align="right">{item.quantity}</TableCell>
                              <TableCell>{item.unit}</TableCell>
                              <TableCell>
                                {item.preferredSuppliers?.join(', ') || 'Any approved supplier'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Cost Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                <MoneyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Cost Estimate Breakdown
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="right">Cost</TableCell>
                      <TableCell>Method</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {sowDetails.costEstimate.breakdown.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.category}</TableCell>
                        <TableCell align="right">{formatCurrency(item.cost)}</TableCell>
                        <TableCell>
                          <Chip label={item.methodology} size="small" />
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell><strong>Total</strong></TableCell>
                      <TableCell align="right">
                        <strong>{formatCurrency(sowDetails.costEstimate.totalCost)}</strong>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${sowDetails.costEstimate.confidence}% confidence`} 
                          color="info" 
                          size="small" 
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Compliance Checks */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                Compliance & Standards
              </Typography>
              <List>
                {sowDetails.complianceChecks.map((check, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      {getComplianceIcon(check.status)}
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body1">{check.standard}</Typography>
                          <Chip 
                            label={check.status.replace('_', ' ')} 
                            color={getComplianceColor(check.status) as any}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          <Typography variant="body2">{check.requirement}</Typography>
                          {check.notes && (
                            <Typography variant="caption" color="text.secondary">
                              {check.notes}
                            </Typography>
                          )}
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Questions Section */}
        {questions.length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  Clarification Questions
                </Typography>
                {questions.map((question) => (
                  <Card key={question.id} variant="outlined" sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography variant="h6">
                          {question.category.charAt(0).toUpperCase() + question.category.slice(1)} Question
                        </Typography>
                        <Chip 
                          label={question.status} 
                          color={question.status === 'pending' ? 'warning' : 'success'}
                          size="small"
                        />
                      </Box>
                      
                      <Typography variant="body1" gutterBottom>
                        <strong>Q:</strong> {question.question}
                      </Typography>
                      
                      {question.response && (
                        <Box mt={2} p={2} bgcolor="success.50" borderRadius={1}>
                          <Typography variant="body1" gutterBottom>
                            <strong>A:</strong> {question.response.answer}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Answered on: {new Date(question.response.respondedAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      )}
                      
                      <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                        Asked on: {new Date(question.askedAt).toLocaleDateString()}
                      </Typography>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Question Dialog */}
      <Dialog 
        open={questionDialogOpen} 
        onClose={() => setQuestionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Ask Clarification Question</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Question Category</InputLabel>
              <Select
                value={newQuestion.category}
                label="Question Category"
                onChange={(e) => setNewQuestion(prev => ({ 
                  ...prev, 
                  category: e.target.value as ClarificationQuestion['category']
                }))}
              >
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="commercial">Commercial</MenuItem>
                <MenuItem value="timeline">Timeline</MenuItem>
                <MenuItem value="materials">Materials</MenuItem>
                <MenuItem value="other">Other</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Your Question"
              value={newQuestion.question}
              onChange={(e) => setNewQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Please provide as much detail as possible to help us give you an accurate answer..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuestionDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAskQuestion}
            variant="contained"
            disabled={!newQuestion.question.trim() || submittingQuestion}
          >
            {submittingQuestion ? <CircularProgress size={20} /> : 'Submit Question'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SoWReviewPage;