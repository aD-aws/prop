import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

interface DocumentsStepProps {
  data: File[];
  onChange: (documents: File[]) => void;
}

const DocumentsStep: React.FC<DocumentsStepProps> = ({ data, onChange }) => {
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});

  const acceptedFileTypes = {
    'application/pdf': ['.pdf'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/tiff': ['.tif', '.tiff'],
    'application/dwg': ['.dwg'],
    'application/dxf': ['.dxf'],
  };

  const maxFileSize = 10 * 1024 * 1024; // 10MB

  const onDrop = (acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.filter(file => {
      // Check if file already exists
      return !data.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );
    });

    if (newFiles.length > 0) {
      onChange([...data, ...newFiles]);
      
      // Simulate upload progress for demo
      newFiles.forEach(file => {
        simulateUploadProgress(file.name);
      });
    }
  };

  const simulateUploadProgress = (fileName: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(prev => ({ ...prev, [fileName]: progress }));
      
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[fileName];
            return newProgress;
          });
        }, 1000);
      }
    }, 200);
  };

  const removeFile = (fileToRemove: File) => {
    onChange(data.filter(file => file !== fileToRemove));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxSize: maxFileSize,
    multiple: true,
  });

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon />;
    } else if (file.type === 'application/pdf') {
      return <PdfIcon />;
    } else {
      return <DocumentIcon />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Box>
      <Typography variant="h5" component="h2" gutterBottom>
        Upload Documents (Optional)
      </Typography>
      
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload any existing plans, drawings, photos, or documents related to your project. 
        Our AI will analyze these to provide more accurate recommendations.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        💡 Supported file types: PDF, JPG, PNG, TIFF, DWG, DXF. Maximum file size: 10MB per file.
      </Alert>

      {/* Upload Area */}
      <Box
        {...getRootProps()}
        sx={{
          border: '2px dashed',
          borderColor: isDragActive ? 'primary.main' : 'grey.300',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease-in-out',
          mb: 3,
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'action.hover',
          },
        }}
      >
        <input {...getInputProps()} />
        <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          or click to browse files
        </Typography>
      </Box>

      {/* File List */}
      {data.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Uploaded Files ({data.length})
          </Typography>
          <List>
            {data.map((file, index) => (
              <ListItem key={`${file.name}-${index}`} divider>
                <ListItemIcon>
                  {getFileIcon(file)}
                </ListItemIcon>
                <ListItemText
                  primary={file.name}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        {formatFileSize(file.size)}
                      </Typography>
                      {uploadProgress[file.name] !== undefined && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={uploadProgress[file.name]} 
                            sx={{ height: 4, borderRadius: 2 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            Uploading... {uploadProgress[file.name]}%
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton
                    edge="end"
                    aria-label="delete"
                    onClick={() => removeFile(file)}
                    disabled={uploadProgress[file.name] !== undefined}
                  >
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* Document Types Help */}
      <Alert severity="info" sx={{ mt: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          Helpful document types to upload:
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
          <Chip label="Existing floor plans" size="small" variant="outlined" />
          <Chip label="Site photos" size="small" variant="outlined" />
          <Chip label="Structural drawings" size="small" variant="outlined" />
          <Chip label="Planning documents" size="small" variant="outlined" />
          <Chip label="Building regulations" size="small" variant="outlined" />
          <Chip label="Survey reports" size="small" variant="outlined" />
        </Box>
      </Alert>
    </Box>
  );
};

export default DocumentsStep;