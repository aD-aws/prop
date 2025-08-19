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
  Chip,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Rating,
  Avatar,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Upload as UploadIcon,
  Business as BusinessIcon,
  Security as SecurityIcon,
  Assignment as AssignmentIcon,
  Star as StarIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { builderService, BuilderProfile } from '../services/builderService';

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
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const BuilderProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<BuilderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [editingCertIndex, setEditingCertIndex] = useState<number | null>(null);
  const [editingPortfolioIndex, setEditingPortfolioIndex] = useState<number | null>(null);

  // Form states
  const [newCertification, setNewCertification] = useState({
    name: '',
    issuingBody: '',
    certificateNumber: '',
    validFrom: '',
    validUntil: '',
    status: 'active' as 'active' | 'expired' | 'pending',
  });

  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: '',
    description: '',
    projectType: '',
    completedDate: '',
    images: [] as string[],
    clientTestimonial: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const profileData = await builderService.getProfile();
      setProfile(profileData);
    } catch (err) {
      setError('Failed to load profile. Please try again.');
      console.error('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleUpdateProfile = async (updates: Partial<BuilderProfile>) => {
    try {
      setSaving(true);
      setError(null);
      await builderService.updateProfile(updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Profile update error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddCertification = async () => {
    if (!newCertification.name || !newCertification.issuingBody) return;

    try {
      const updatedCertifications = profile?.certifications ? [...profile.certifications] : [];
      
      if (editingCertIndex !== null) {
        updatedCertifications[editingCertIndex] = newCertification;
        setEditingCertIndex(null);
      } else {
        updatedCertifications.push(newCertification);
      }

      await handleUpdateProfile({ certifications: updatedCertifications });
      
      setNewCertification({
        name: '',
        issuingBody: '',
        certificateNumber: '',
        validFrom: '',
        validUntil: '',
        status: 'active',
      });
      setCertDialogOpen(false);
    } catch (err) {
      setError('Failed to add certification. Please try again.');
    }
  };

  const handleEditCertification = (index: number) => {
    if (profile?.certifications[index]) {
      setNewCertification(profile.certifications[index]);
      setEditingCertIndex(index);
      setCertDialogOpen(true);
    }
  };

  const handleDeleteCertification = async (index: number) => {
    if (!profile?.certifications) return;

    const updatedCertifications = profile.certifications.filter((_, i) => i !== index);
    await handleUpdateProfile({ certifications: updatedCertifications });
  };

  const handleAddPortfolioItem = async () => {
    if (!newPortfolioItem.title || !newPortfolioItem.description) return;

    try {
      const result = await builderService.addPortfolioItem(newPortfolioItem);
      
      const updatedPortfolio = profile?.portfolio ? [...profile.portfolio] : [];
      updatedPortfolio.push({ ...newPortfolioItem, id: result.id });
      
      setProfile(prev => prev ? { ...prev, portfolio: updatedPortfolio } : null);
      
      setNewPortfolioItem({
        title: '',
        description: '',
        projectType: '',
        completedDate: '',
        images: [],
        clientTestimonial: '',
      });
      setPortfolioDialogOpen(false);
    } catch (err) {
      setError('Failed to add portfolio item. Please try again.');
    }
  };

  const handleFileUpload = async (files: File[], type: 'certificate' | 'insurance' | 'portfolio') => {
    try {
      // Handle file uploads based on type
      for (const file of files) {
        if (type === 'certificate') {
          await builderService.uploadCertificate(file, 'general');
        } else if (type === 'insurance') {
          await builderService.uploadInsuranceDocument(file, 'general');
        }
      }
    } catch (err) {
      setError('Failed to upload file. Please try again.');
    }
  };

  const { getRootProps: getCertRootProps, getInputProps: getCertInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    onDrop: (files) => handleFileUpload(files, 'certificate'),
  });

  const { getRootProps: getInsuranceRootProps, getInputProps: getInsuranceInputProps } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    onDrop: (files) => handleFileUpload(files, 'insurance'),
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'expired': return 'error';
      case 'pending': return 'warning';
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

  if (!profile) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Profile not found. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Builder Profile Management
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="profile tabs">
          <Tab 
            icon={<BusinessIcon />} 
            label="Company Details" 
            id="profile-tab-0"
            aria-controls="profile-tabpanel-0"
          />
          <Tab 
            icon={<SecurityIcon />} 
            label="Certifications & Insurance" 
            id="profile-tab-1"
            aria-controls="profile-tabpanel-1"
          />
          <Tab 
            icon={<ImageIcon />} 
            label="Portfolio" 
            id="profile-tab-2"
            aria-controls="profile-tabpanel-2"
          />
          <Tab 
            icon={<StarIcon />} 
            label="Ratings & Reviews" 
            id="profile-tab-3"
            aria-controls="profile-tabpanel-3"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Company Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Company Name"
                      value={profile.companyName}
                      onChange={(e) => handleUpdateProfile({ companyName: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Contact First Name"
                      value={profile.contactPerson.firstName}
                      onChange={(e) => handleUpdateProfile({
                        contactPerson: { ...profile.contactPerson, firstName: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Contact Last Name"
                      value={profile.contactPerson.lastName}
                      onChange={(e) => handleUpdateProfile({
                        contactPerson: { ...profile.contactPerson, lastName: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      type="email"
                      value={profile.contactPerson.email}
                      onChange={(e) => handleUpdateProfile({
                        contactPerson: { ...profile.contactPerson, email: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={profile.contactPerson.phone}
                      onChange={(e) => handleUpdateProfile({
                        contactPerson: { ...profile.contactPerson, phone: e.target.value }
                      })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Business Details
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Registration Number"
                      value={profile.businessDetails.registrationNumber}
                      onChange={(e) => handleUpdateProfile({
                        businessDetails: { ...profile.businessDetails, registrationNumber: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="VAT Number"
                      value={profile.businessDetails.vatNumber || ''}
                      onChange={(e) => handleUpdateProfile({
                        businessDetails: { ...profile.businessDetails, vatNumber: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      fullWidth
                      label="Established Year"
                      type="number"
                      value={profile.businessDetails.establishedYear}
                      onChange={(e) => handleUpdateProfile({
                        businessDetails: { ...profile.businessDetails, establishedYear: parseInt(e.target.value) }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Employee Count"
                      type="number"
                      value={profile.businessDetails.employeeCount}
                      onChange={(e) => handleUpdateProfile({
                        businessDetails: { ...profile.businessDetails, employeeCount: parseInt(e.target.value) }
                      })}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Address
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={8}>
                    <TextField
                      fullWidth
                      label="Street Address"
                      value={profile.address.street}
                      onChange={(e) => handleUpdateProfile({
                        address: { ...profile.address, street: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      label="Postcode"
                      value={profile.address.postcode}
                      onChange={(e) => handleUpdateProfile({
                        address: { ...profile.address, postcode: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={profile.address.city}
                      onChange={(e) => handleUpdateProfile({
                        address: { ...profile.address, city: e.target.value }
                      })}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      fullWidth
                      multiline
                      rows={2}
                      label="Service Areas"
                      value={profile.serviceAreas.join(', ')}
                      onChange={(e) => handleUpdateProfile({
                        serviceAreas: e.target.value.split(', ').filter(area => area.trim())
                      })}
                      placeholder="Postcodes or regions you serve..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Specializations
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Areas of Expertise"
                  value={profile.specializations.join(', ')}
                  onChange={(e) => handleUpdateProfile({
                    specializations: e.target.value.split(', ').filter(spec => spec.trim())
                  })}
                  placeholder="e.g., Loft conversions, Extensions, Renovations..."
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Certifications */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                  <Typography variant="h6">
                    Professional Certifications
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setCertDialogOpen(true)}
                  >
                    Add Certification
                  </Button>
                </Box>

                {profile.certifications.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Certification</TableCell>
                          <TableCell>Issuing Body</TableCell>
                          <TableCell>Certificate Number</TableCell>
                          <TableCell>Valid From</TableCell>
                          <TableCell>Valid Until</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {profile.certifications.map((cert, index) => (
                          <TableRow key={index}>
                            <TableCell>{cert.name}</TableCell>
                            <TableCell>{cert.issuingBody}</TableCell>
                            <TableCell>{cert.certificateNumber}</TableCell>
                            <TableCell>{new Date(cert.validFrom).toLocaleDateString()}</TableCell>
                            <TableCell>{new Date(cert.validUntil).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Chip 
                                label={cert.status} 
                                color={getStatusColor(cert.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <IconButton 
                                size="small" 
                                onClick={() => handleEditCertification(index)}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton 
                                size="small" 
                                color="error"
                                onClick={() => handleDeleteCertification(index)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    No certifications added yet. Click "Add Certification" to get started.
                  </Alert>
                )}

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Upload Certificate Documents
                  </Typography>
                  <Box
                    {...getCertRootProps()}
                    sx={{
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <input {...getCertInputProps()} />
                    <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      Drag & drop certificate files here, or click to select
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: PDF, JPG, PNG
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Insurance */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Insurance Coverage
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Public Liability
                        </Typography>
                        <Typography variant="h6" color="primary">
                          £{profile.insurance.publicLiability.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Provider: {profile.insurance.publicLiability.provider}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valid until: {new Date(profile.insurance.publicLiability.validUntil).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Employers Liability
                        </Typography>
                        <Typography variant="h6" color="primary">
                          £{profile.insurance.employersLiability.coverage.toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Provider: {profile.insurance.employersLiability.provider}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Valid until: {new Date(profile.insurance.employersLiability.validUntil).toLocaleDateString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  {profile.insurance.professionalIndemnity && (
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            Professional Indemnity
                          </Typography>
                          <Typography variant="h6" color="primary">
                            £{profile.insurance.professionalIndemnity.coverage.toLocaleString()}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Provider: {profile.insurance.professionalIndemnity.provider}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Valid until: {new Date(profile.insurance.professionalIndemnity.validUntil).toLocaleDateString()}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  )}
                </Grid>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Upload Insurance Documents
                  </Typography>
                  <Box
                    {...getInsuranceRootProps()}
                    sx={{
                      border: '2px dashed #ccc',
                      borderRadius: 2,
                      p: 3,
                      textAlign: 'center',
                      cursor: 'pointer',
                      '&:hover': { borderColor: 'primary.main' },
                    }}
                  >
                    <input {...getInsuranceInputProps()} />
                    <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                    <Typography variant="body1" color="text.secondary">
                      Drag & drop insurance documents here, or click to select
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Supported formats: PDF, JPG, PNG
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h6">
                Project Portfolio
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setPortfolioDialogOpen(true)}
              >
                Add Project
              </Button>
            </Box>

            <Grid container spacing={3}>
              {profile.portfolio.map((project, index) => (
                <Grid item xs={12} md={6} lg={4} key={project.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {project.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {project.projectType} • Completed: {new Date(project.completedDate).toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" paragraph>
                        {project.description}
                      </Typography>
                      {project.clientTestimonial && (
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mt: 2 }}>
                          <Typography variant="body2" fontStyle="italic">
                            "{project.clientTestimonial}"
                          </Typography>
                        </Box>
                      )}
                      {project.images.length > 0 && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                          {project.images.slice(0, 3).map((image, imgIndex) => (
                            <Avatar
                              key={imgIndex}
                              src={image}
                              variant="rounded"
                              sx={{ width: 60, height: 60 }}
                            />
                          ))}
                          {project.images.length > 3 && (
                            <Avatar
                              variant="rounded"
                              sx={{ width: 60, height: 60, bgcolor: 'grey.300' }}
                            >
                              +{project.images.length - 3}
                            </Avatar>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {profile.portfolio.length === 0 && (
              <Alert severity="info">
                No portfolio projects added yet. Showcase your work by adding completed projects.
              </Alert>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Ratings & Reviews
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box textAlign="center" p={3}>
                  <Typography variant="h2" color="primary">
                    {profile.ratings.overall.toFixed(1)}
                  </Typography>
                  <Rating value={profile.ratings.overall} readOnly size="large" />
                  <Typography variant="body1" color="text.secondary">
                    Based on {profile.ratings.reviewCount} reviews
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <List>
                  <ListItem>
                    <ListItemText primary="Quality of Work" />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={profile.ratings.quality} readOnly size="small" />
                        <Typography variant="body2">
                          {profile.ratings.quality.toFixed(1)}
                        </Typography>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Timeliness" />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={profile.ratings.timeliness} readOnly size="small" />
                        <Typography variant="body2">
                          {profile.ratings.timeliness.toFixed(1)}
                        </Typography>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Communication" />
                    <ListItemSecondaryAction>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Rating value={profile.ratings.communication} readOnly size="small" />
                        <Typography variant="body2">
                          {profile.ratings.communication.toFixed(1)}
                        </Typography>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Certification Dialog */}
      <Dialog 
        open={certDialogOpen} 
        onClose={() => setCertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingCertIndex !== null ? 'Edit' : 'Add'} Certification
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Certification Name"
                  value={newCertification.name}
                  onChange={(e) => setNewCertification(prev => ({ 
                    ...prev, 
                    name: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Issuing Body"
                  value={newCertification.issuingBody}
                  onChange={(e) => setNewCertification(prev => ({ 
                    ...prev, 
                    issuingBody: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Certificate Number"
                  value={newCertification.certificateNumber}
                  onChange={(e) => setNewCertification(prev => ({ 
                    ...prev, 
                    certificateNumber: e.target.value 
                  }))}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newCertification.status}
                    label="Status"
                    onChange={(e) => setNewCertification(prev => ({ 
                      ...prev, 
                      status: e.target.value as 'active' | 'expired' | 'pending'
                    }))}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="expired">Expired</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Valid From"
                  type="date"
                  value={newCertification.validFrom}
                  onChange={(e) => setNewCertification(prev => ({ 
                    ...prev, 
                    validFrom: e.target.value 
                  }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Valid Until"
                  type="date"
                  value={newCertification.validUntil}
                  onChange={(e) => setNewCertification(prev => ({ 
                    ...prev, 
                    validUntil: e.target.value 
                  }))}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCertDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddCertification}
            variant="contained"
            disabled={!newCertification.name || !newCertification.issuingBody}
          >
            {editingCertIndex !== null ? 'Update' : 'Add'} Certification
          </Button>
        </DialogActions>
      </Dialog>

      {/* Portfolio Dialog */}
      <Dialog 
        open={portfolioDialogOpen} 
        onClose={() => setPortfolioDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Portfolio Project</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Project Title"
                  value={newPortfolioItem.title}
                  onChange={(e) => setNewPortfolioItem(prev => ({ 
                    ...prev, 
                    title: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Project Type"
                  value={newPortfolioItem.projectType}
                  onChange={(e) => setNewPortfolioItem(prev => ({ 
                    ...prev, 
                    projectType: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Project Description"
                  value={newPortfolioItem.description}
                  onChange={(e) => setNewPortfolioItem(prev => ({ 
                    ...prev, 
                    description: e.target.value 
                  }))}
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Completion Date"
                  type="date"
                  value={newPortfolioItem.completedDate}
                  onChange={(e) => setNewPortfolioItem(prev => ({ 
                    ...prev, 
                    completedDate: e.target.value 
                  }))}
                  InputLabelProps={{ shrink: true }}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Client Testimonial (Optional)"
                  value={newPortfolioItem.clientTestimonial}
                  onChange={(e) => setNewPortfolioItem(prev => ({ 
                    ...prev, 
                    clientTestimonial: e.target.value 
                  }))}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPortfolioDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPortfolioItem}
            variant="contained"
            disabled={!newPortfolioItem.title || !newPortfolioItem.description}
          >
            Add Project
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BuilderProfilePage;