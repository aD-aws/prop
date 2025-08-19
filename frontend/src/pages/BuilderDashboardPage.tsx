import React, { useState, useEffect } from 'react';
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
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  Work as WorkIcon,
  Assignment as AssignmentIcon,
  QuestionAnswer as QuestionIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { builderService, SoWOpportunity, Quote, ClarificationQuestion } from '../services/builderService';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`builder-tabpanel-${index}`}
      aria-labelledby={`builder-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BuilderDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [opportunities, setOpportunities] = useState<SoWOpportunity[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState({
    projectType: '',
    location: '',
    budgetMin: '',
    budgetMax: '',
    timeline: '',
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [opportunitiesData, quotesData, questionsData] = await Promise.all([
        builderService.getAvailableOpportunities(),
        builderService.getMyQuotes(),
        builderService.getMyClarificationQuestions(),
      ]);

      setOpportunities(opportunitiesData);
      setQuotes(quotesData);
      setQuestions(questionsData);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleFilterChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSelectChange = (field: string) => (
    event: SelectChangeEvent
  ) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      const filterParams: any = {};
      
      if (filters.projectType) filterParams.projectType = filters.projectType;
      if (filters.location) filterParams.location = filters.location;
      if (filters.budgetMin && filters.budgetMax) {
        filterParams.budgetRange = {
          min: parseInt(filters.budgetMin),
          max: parseInt(filters.budgetMax),
        };
      }
      if (filters.timeline) filterParams.timeline = parseInt(filters.timeline);

      const filteredOpportunities = await builderService.getAvailableOpportunities(filterParams);
      setOpportunities(filteredOpportunities);
    } catch (err) {
      setError('Failed to apply filters. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      projectType: '',
      location: '',
      budgetMin: '',
      budgetMax: '',
      timeline: '',
    });
    loadDashboardData();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'success';
      case 'quoted': return 'warning';
      case 'awarded': return 'info';
      case 'expired': return 'error';
      case 'submitted': return 'primary';
      case 'selected': return 'success';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const pendingQuestions = questions.filter(q => q.status === 'pending').length;
  const activeQuotes = quotes.filter(q => q.status === 'submitted').length;

  if (loading && opportunities.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Builder Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="builder dashboard tabs">
          <Tab 
            icon={<WorkIcon />} 
            label="Available Opportunities" 
            id="builder-tab-0"
            aria-controls="builder-tabpanel-0"
          />
          <Tab 
            icon={
              <Badge badgeContent={activeQuotes} color="primary">
                <AssignmentIcon />
              </Badge>
            } 
            label="My Quotes" 
            id="builder-tab-1"
            aria-controls="builder-tabpanel-1"
          />
          <Tab 
            icon={
              <Badge badgeContent={pendingQuestions} color="error">
                <QuestionIcon />
              </Badge>
            } 
            label="Questions" 
            id="builder-tab-2"
            aria-controls="builder-tabpanel-2"
          />
          <Tab 
            icon={<PersonIcon />} 
            label="Profile" 
            id="builder-tab-3"
            aria-controls="builder-tabpanel-3"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              Filter Opportunities
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Project Type</InputLabel>
                  <Select
                    value={filters.projectType}
                    label="Project Type"
                    onChange={handleSelectChange('projectType')}
                  >
                    <MenuItem value="">All Types</MenuItem>
                    <MenuItem value="loft-conversion">Loft Conversion</MenuItem>
                    <MenuItem value="extension">Extension</MenuItem>
                    <MenuItem value="renovation">Renovation</MenuItem>
                    <MenuItem value="new-build">New Build</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Location"
                  value={filters.location}
                  onChange={handleFilterChange('location')}
                  placeholder="Postcode or city"
                />
              </Grid>
              <Grid item xs={6} sm={3} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min Budget"
                  type="number"
                  value={filters.budgetMin}
                  onChange={handleFilterChange('budgetMin')}
                  InputProps={{ startAdornment: '£' }}
                />
              </Grid>
              <Grid item xs={6} sm={3} md={1.5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Budget"
                  type="number"
                  value={filters.budgetMax}
                  onChange={handleFilterChange('budgetMax')}
                  InputProps={{ startAdornment: '£' }}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Timeline (days)"
                  type="number"
                  value={filters.timeline}
                  onChange={handleFilterChange('timeline')}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={2}>
                <Box display="flex" gap={1}>
                  <Button variant="contained" onClick={applyFilters} disabled={loading}>
                    Apply
                  </Button>
                  <Button variant="outlined" onClick={clearFilters}>
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Opportunities Grid */}
        <Grid container spacing={3}>
          {opportunities.map((opportunity) => (
            <Grid item xs={12} md={6} lg={4} key={opportunity.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3" noWrap>
                      {opportunity.title}
                    </Typography>
                    <Chip 
                      label={opportunity.status} 
                      color={getStatusColor(opportunity.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {opportunity.projectType}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    {opportunity.propertyAddress.street}, {opportunity.propertyAddress.city}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Budget:</strong> {formatCurrency(opportunity.budget.min)} - {formatCurrency(opportunity.budget.max)}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Timeline:</strong> {opportunity.timeline} days
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Deadline:</strong> {new Date(opportunity.deadline).toLocaleDateString()}
                  </Typography>
                  
                  <Typography variant="body2" sx={{ mt: 2 }}>
                    {opportunity.description.length > 100 
                      ? `${opportunity.description.substring(0, 100)}...`
                      : opportunity.description
                    }
                  </Typography>
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigate(`/builder/sow/${opportunity.id}`)}
                  >
                    View Details
                  </Button>
                  <Button 
                    size="small" 
                    variant="contained"
                    onClick={() => navigate(`/builder/quote/${opportunity.id}`)}
                    disabled={opportunity.status !== 'available'}
                  >
                    Submit Quote
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {opportunities.length === 0 && !loading && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No opportunities available at the moment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Check back later or adjust your filters
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {quotes.map((quote) => (
            <Grid item xs={12} md={6} lg={4} key={quote.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3" noWrap>
                      {quote.projectTitle}
                    </Typography>
                    <Chip 
                      label={quote.status} 
                      color={getStatusColor(quote.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Quote Amount:</strong> {formatCurrency(quote.totalPrice)}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Timeline:</strong> {quote.timeline} days
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Submitted:</strong> {new Date(quote.submittedAt).toLocaleDateString()}
                  </Typography>
                  
                  <Typography variant="body2" gutterBottom>
                    <strong>Valid Until:</strong> {new Date(quote.validUntil).toLocaleDateString()}
                  </Typography>

                  {quote.clientResponse && (
                    <Box mt={2} p={1} bgcolor="grey.50" borderRadius={1}>
                      <Typography variant="caption" color="text.secondary">
                        Client Response: {quote.clientResponse.status}
                      </Typography>
                      {quote.clientResponse.message && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {quote.clientResponse.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigate(`/builder/quotes/${quote.id}`)}
                  >
                    View Details
                  </Button>
                  {quote.status === 'draft' && (
                    <Button 
                      size="small" 
                      variant="contained"
                      onClick={() => navigate(`/builder/quotes/${quote.id}/edit`)}
                    >
                      Edit
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {quotes.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No quotes submitted yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Browse available opportunities to submit your first quote
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {questions.map((question) => (
            <Grid item xs={12} key={question.id}>
              <Card>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Typography variant="h6" component="h3">
                      {question.category.charAt(0).toUpperCase() + question.category.slice(1)} Question
                    </Typography>
                    <Chip 
                      label={question.status} 
                      color={question.status === 'pending' ? 'warning' : 'success'}
                      size="small"
                    />
                  </Box>
                  
                  <Typography variant="body1" gutterBottom>
                    <strong>Question:</strong> {question.question}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Asked on: {new Date(question.askedAt).toLocaleDateString()}
                  </Typography>

                  {question.response && (
                    <Box mt={2} p={2} bgcolor="success.50" borderRadius={1}>
                      <Typography variant="body2" gutterBottom>
                        <strong>Answer:</strong> {question.response.answer}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Answered on: {new Date(question.response.respondedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  )}
                </CardContent>
                
                <CardActions>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => navigate(`/builder/sow/${question.sowId}`)}
                  >
                    View SoW
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {questions.length === 0 && (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="text.secondary">
              No questions asked yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can ask clarification questions when reviewing SoW details
            </Typography>
          </Box>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Box display="flex" justifyContent="center">
          <Button 
            variant="contained" 
            size="large"
            onClick={() => navigate('/builder/profile')}
          >
            Manage Profile
          </Button>
        </Box>
      </TabPanel>
    </Container>
  );
};

export default BuilderDashboardPage;