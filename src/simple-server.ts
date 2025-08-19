import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/database';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'UK Home Improvement Platform API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API endpoints for preview
app.get('/api/projects', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        name: 'Kitchen Extension',
        type: 'extension',
        status: 'planning',
        address: '123 Main Street, London, SW1A 1AA',
        createdAt: '2024-01-15T10:00:00Z',
        estimatedCost: 25000
      },
      {
        id: '2',
        name: 'Bathroom Renovation',
        type: 'renovation',
        status: 'in_progress',
        address: '456 Oak Avenue, Manchester, M1 1AA',
        createdAt: '2024-01-10T14:30:00Z',
        estimatedCost: 12000
      }
    ]
  });
});

app.post('/api/projects', (req, res) => {
  const project = {
    id: Date.now().toString(),
    ...req.body,
    status: 'planning',
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    data: project,
    message: 'Project created successfully'
  });
});

app.get('/api/projects/:id', (req, res) => {
  const { id } = req.params;
  
  res.json({
    success: true,
    data: {
      id,
      name: 'Kitchen Extension',
      type: 'extension',
      status: 'planning',
      address: '123 Main Street, London, SW1A 1AA',
      description: 'Single-story rear extension to create open-plan kitchen-dining area',
      createdAt: '2024-01-15T10:00:00Z',
      estimatedCost: 25000,
      documents: [
        {
          id: '1',
          name: 'Floor Plan.pdf',
          type: 'structural_drawing',
          uploadedAt: '2024-01-15T11:00:00Z'
        }
      ]
    }
  });
});

// Mock SoW generation endpoint
app.post('/api/sow/generate', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      data: {
        id: Date.now().toString(),
        projectId: req.body.projectId,
        content: `# Scope of Work - Kitchen Extension

## Project Overview
Single-story rear extension to create an open-plan kitchen-dining area.

## Work Stages

### Stage 1: Preparation and Planning
- Obtain necessary building permits
- Set up site safety measures
- Order materials and equipment

### Stage 2: Structural Work
- Excavation and foundation work
- Steel beam installation
- Wall construction

### Stage 3: Roofing and Weatherproofing
- Roof structure installation
- Weatherproofing and insulation
- Window and door installation

### Stage 4: Internal Fit-out
- Electrical and plumbing installation
- Plastering and decoration
- Kitchen installation

## Estimated Timeline: 8-12 weeks
## Estimated Cost: £25,000 - £30,000

*Generated using AI analysis of project requirements and UK building standards.*`,
        generatedAt: new Date().toISOString(),
        status: 'draft'
      }
    });
  }, 2000); // Simulate AI processing time
});

// Mock authentication endpoints
app.post('/api/auth/register', (req, res) => {
  const { email, password, firstName, lastName, userType = 'homeowner', phone } = req.body;
  
  res.json({
    token: 'mock-jwt-token-' + Date.now(),
    user: {
      id: Date.now().toString(),
      email: email,
      userType: userType,
      profile: {
        firstName: firstName,
        lastName: lastName,
        phone: phone
      }
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Dummy credentials for testing
  const dummyUsers = {
    'homeowner@test.com': {
      id: '1',
      email: 'homeowner@test.com',
      name: 'John Smith',
      userType: 'homeowner'
    },
    'builder@test.com': {
      id: '2', 
      email: 'builder@test.com',
      name: 'Mike Builder',
      userType: 'builder'
    },
    'admin@test.com': {
      id: '3',
      email: 'admin@test.com', 
      name: 'Admin User',
      userType: 'admin'
    }
  };
  
  const user = dummyUsers[email as keyof typeof dummyUsers];
  
  if (user && password === 'password123') {
    // Format response to match frontend expectations
    const [firstName, lastName] = user.name.split(' ');
    res.json({
      token: 'mock-jwt-token-' + user.id,
      user: {
        id: user.id,
        email: user.email,
        userType: user.userType,
        profile: {
          firstName: firstName || user.name,
          lastName: lastName || '',
          phone: '+44 7700 900123'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }
});

// Get current user endpoint
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No valid token provided'
      }
    });
  }
  
  // Mock user based on token
  const token = authHeader.split(' ')[1];
  let user;
  
  if (token.includes('-1')) {
    user = { 
      id: '1', 
      email: 'homeowner@test.com', 
      userType: 'homeowner',
      profile: {
        firstName: 'John',
        lastName: 'Smith',
        phone: '+44 7700 900123'
      }
    };
  } else if (token.includes('-2')) {
    user = { 
      id: '2', 
      email: 'builder@test.com', 
      userType: 'builder',
      profile: {
        firstName: 'Mike',
        lastName: 'Builder',
        phone: '+44 7700 900456'
      }
    };
  } else if (token.includes('-3')) {
    user = { 
      id: '3', 
      email: 'admin@test.com', 
      userType: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        phone: '+44 7700 900789'
      }
    };
  } else {
    user = { 
      id: '1', 
      email: 'homeowner@test.com', 
      userType: 'homeowner',
      profile: {
        firstName: 'John',
        lastName: 'Smith',
        phone: '+44 7700 900123'
      }
    };
  }
  
  res.json(user);
});

// Mock document upload endpoint
app.post('/api/projects/:id/documents', (req, res) => {
  res.json({
    success: true,
    data: {
      id: Date.now().toString(),
      projectId: req.params.id,
      name: 'uploaded-document.pdf',
      type: 'structural_drawing',
      size: 1024000,
      uploadedAt: new Date().toISOString(),
      status: 'processing'
    },
    message: 'Document uploaded successfully'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 UK Home Improvement Platform API running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;