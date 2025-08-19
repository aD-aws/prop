# UK Home Improvement Platform 🏠

A comprehensive full-stack platform for UK home improvement projects with AI-powered Scope of Work generation, built with React, Node.js, and AWS services.

## 🚀 Live Demo

- **API Endpoint**: `https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api`
- **Test Credentials**: 
  - Email: `homeowner@test.com`
  - Password: `password123`

## ✨ Features

### ✅ **Fully Implemented & Working**
- 🏗️ **Project Creation & Management** - Create, store, and manage home improvement projects
- 📊 **Real-time Dashboard** - View all projects with live data from DynamoDB
- 🤖 **AI-Powered SoW Generation** - Generate detailed Scopes of Work using project-specific templates
- 🔐 **Authentication System** - JWT-based login/logout with role-based access
- 🏠 **Property Address Validation** - UK postcode validation and address handling
- 📱 **Responsive Frontend** - Mobile-friendly React interface
- ☁️ **AWS Cloud Deployment** - Production-ready Lambda + API Gateway + DynamoDB
- 🔄 **Real-time Data Sync** - Frontend connects to live AWS backend
- 📋 **Project Types Support** - Loft conversions, extensions, renovations, etc.
- 🛡️ **CORS & Security** - Proper error handling and security headers

### 🏗️ **Architecture Implemented**
- **Frontend**: React.js with TypeScript, Material-UI
- **Backend**: AWS Lambda functions with Node.js
- **Database**: DynamoDB with single-table design
- **API**: AWS API Gateway with CORS support
- **Authentication**: JWT tokens with mock user system
- **File Storage**: AWS S3 integration ready
- **Monitoring**: CloudWatch logging and error tracking

## 🛠️ Tech Stack

### Frontend
- **React.js 18** with TypeScript
- **Material-UI** for components
- **Axios** for API calls
- **React Router** for navigation
- **Context API** for state management

### Backend
- **AWS Lambda** (Node.js 18.x runtime)
- **AWS API Gateway** for REST API
- **AWS DynamoDB** for data storage
- **AWS S3** for file storage
- **AWS CloudFormation** for infrastructure

### Development & Testing
- **Jest** for unit testing
- **Cypress** for E2E testing
- **ESLint** for code quality
- **Docker** for containerization

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/aD-aws/prop.git
cd prop
```

### 2. Install Dependencies
```bash
# Backend dependencies
npm install

# Frontend dependencies
cd frontend && npm install && cd ..
```

### 3. Run Frontend Locally
```bash
cd frontend
npm start
```
The frontend will start on `http://localhost:3000` and connect to the live AWS API.

### 4. Test the Application
1. Open `http://localhost:3000`
2. Click "Login" and use test credentials:
   - Email: `homeowner@test.com`
   - Password: `password123`
3. Create a new project and test the SoW generation

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Projects
- `GET /api/projects` - Get all user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/{id}` - Get specific project
- `GET /api/projects/types` - Get available project types

### Scope of Work
- `POST /api/sow/generate` - Generate SoW for a project

### System
- `GET /api/health` - Health check

## 📊 Current Status

### ✅ **Working Features**
1. **Project Creation** - Users can create projects that are stored in DynamoDB
2. **Project Dashboard** - Real-time display of all user projects
3. **SoW Generation** - AI-powered generation of detailed Scopes of Work
4. **Authentication** - Login/logout with JWT tokens
5. **Data Persistence** - All data stored in AWS DynamoDB
6. **API Integration** - Frontend successfully connects to AWS Lambda API
7. **Error Handling** - Proper error responses and user feedback
8. **Responsive Design** - Works on desktop and mobile devices

### 🔧 **Technical Achievements**
- Fixed React rendering errors with object data structures
- Implemented proper data transformation between frontend and backend
- Configured CORS for cross-origin requests
- Set up DynamoDB single-table design with GSI indexes
- Created comprehensive CloudFormation templates
- Implemented proper error handling and logging
- Built reusable React components with TypeScript

## 🏗️ Project Structure

```
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API service layer
│   │   └── contexts/       # React contexts
├── src/                     # Node.js backend (for local development)
├── aws/                     # AWS deployment files
│   ├── cloudformation/     # CloudFormation templates
│   └── scripts/           # Deployment scripts
├── .kiro/specs/            # Project specifications and tasks
└── docs/                   # Documentation
```

## 🚀 Deployment

The application is deployed using AWS CloudFormation:

### Deploy to AWS
```bash
# Deploy the MVP version (currently active)
./aws/scripts/mvp-deploy.sh production eu-west-2

# Update Lambda function code
./aws/scripts/update-mvp-lambda.sh production eu-west-2
```

### Infrastructure Components
- **AWS Lambda** - Serverless API functions
- **API Gateway** - REST API endpoint
- **DynamoDB** - NoSQL database
- **S3** - File storage
- **CloudWatch** - Logging and monitoring
- **IAM** - Security and permissions

## 🧪 Testing

### Run Tests
```bash
# Backend tests
npm test

# Frontend tests
cd frontend && npm test

# E2E tests
npm run test:e2e
```

### Test Coverage
- Unit tests for services and models
- Integration tests for API endpoints
- E2E tests for user workflows
- Performance tests for load handling

## 📈 Performance & Scalability

- **Serverless Architecture** - Auto-scaling Lambda functions
- **DynamoDB** - NoSQL database with on-demand scaling
- **CDN Ready** - S3 + CloudFront for static assets
- **Caching** - Redis integration for performance
- **Monitoring** - CloudWatch metrics and alarms

## 🔒 Security

- **JWT Authentication** - Secure token-based auth
- **CORS Configuration** - Proper cross-origin setup
- **Input Validation** - Joi schema validation
- **Error Handling** - Secure error responses
- **AWS IAM** - Least privilege access

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🆘 Support

For issues and questions:
1. Check the [Issues](https://github.com/aD-aws/prop/issues) page
2. Review the documentation in `/docs`
3. Test with the live API endpoint

---

**Built with ❤️ for UK homeowners and builders**