# Quick Start Guide - UK Home Improvement Platform

## 🚀 Understanding the Code Flow

### 1. **Application Entry Points**

The platform has three main entry points depending on your use case:

#### **Development Mode (Simple)**
```bash
npm run dev
```
- **File**: `src/simple-server.ts`
- **Purpose**: Lightweight development with mock data
- **Port**: 3000
- **Features**: Basic API endpoints, mock authentication
- **Best for**: Frontend development, quick testing

#### **Development Mode (Full)**
```bash
npm run dev:full-app
```
- **File**: `src/index.ts`
- **Purpose**: Full-featured development server
- **Port**: 3000
- **Features**: Redis, WebSocket, all services
- **Best for**: Backend development, integration testing

#### **Production Mode (AWS Lambda)**
```bash
./deploy-mvp.sh
```
- **File**: `src/lambda-handler.ts` (embedded in CloudFormation)
- **Purpose**: Serverless production deployment
- **Features**: Auto-scaling, pay-per-use, AWS integration

### 2. **Request Flow Walkthrough**

```
Client Request → Express App → Middleware → Routes → Services → Database → Response
```

#### **Example: Creating a Project**

1. **Client sends request**:
   ```bash
   POST /api/projects
   {
     "propertyAddress": {"line1": "123 Main St", "city": "London"},
     "projectType": "loft-conversion",
     "requirements": {"description": "Convert loft to bedroom"}
   }
   ```

2. **Express middleware processes**:
   - CORS headers added
   - Request parsed as JSON
   - Request ID generated
   - Request logged

3. **Route handler called** (`src/routes/projects.ts`):
   ```typescript
   router.post('/', createProject);
   ```

4. **Service layer processes** (`src/services/ProjectService.ts`):
   - Validates input data
   - Generates unique project ID
   - Saves to DynamoDB
   - Returns project object

5. **Response sent back**:
   ```json
   {
     "success": true,
     "data": {
       "id": "proj_123",
       "status": "planning",
       "createdAt": "2024-01-15T10:00:00Z"
     }
   }
   ```

### 3. **Key Code Components**

#### **Configuration** (`src/config/`)
- Central configuration management
- Environment-specific settings
- AWS service configurations

#### **Models** (`src/models/`)
- Data structures and validation
- Business logic encapsulation
- Database schema definitions

#### **Services** (`src/services/`)
- Business logic implementation
- External API integrations
- Data processing and transformation

#### **Routes** (`src/routes/`)
- HTTP endpoint definitions
- Request/response handling
- Input validation and sanitization

## 🏗️ MVP Deployment Guide

### Prerequisites

1. **Install AWS CLI**:
   ```bash
   # macOS
   brew install awscli
   
   # Or download from: https://aws.amazon.com/cli/
   ```

2. **Configure AWS credentials**:
   ```bash
   aws configure
   # Enter your Access Key ID, Secret Access Key, Region (eu-west-2), Output format (json)
   ```

3. **Install Node.js 18+**:
   ```bash
   # Check version
   node --version  # Should be 18.x or higher
   ```

### Deployment Steps

#### **Step 1: Prepare the Application**
```bash
# Clone/navigate to project directory
cd uk-home-improvement-platform

# Install dependencies (if not already done)
npm install

# Run tests (optional but recommended)
npm test
```

#### **Step 2: Deploy to AWS**
```bash
# Deploy to production (default)
./deploy-mvp.sh

# Or deploy to staging
./deploy-mvp.sh staging

# Or specify region
./deploy-mvp.sh production eu-west-1
```

#### **Step 3: Verify Deployment**
The script will automatically test your deployment, but you can also manually verify:

```bash
# Test health endpoint
curl https://your-api-url.execute-api.eu-west-2.amazonaws.com/production/api/health

# Test login
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"homeowner@test.com","password":"password123"}'

# Test projects endpoint
curl https://your-api-url/api/projects
```

### What Gets Deployed

The MVP deployment creates these AWS resources:

1. **Lambda Function**: Runs your Node.js application
2. **API Gateway**: Provides HTTP endpoints
3. **DynamoDB Table**: Stores application data
4. **S3 Bucket**: Stores uploaded documents
5. **IAM Roles**: Provides necessary permissions

### Cost Estimation

**Monthly costs for low traffic (< 10,000 requests/month)**:
- Lambda: $0-2 (first 1M requests free)
- API Gateway: $0-3 (first 1M requests $3.50)
- DynamoDB: $0-2 (pay per request)
- S3: $0-1 (minimal storage)
- **Total: $5-15/month**

## 🧪 Testing Your Deployment

### 1. **API Endpoints Testing**

```bash
# Set your API URL
API_URL="https://your-api-id.execute-api.eu-west-2.amazonaws.com/production"

# Health check
curl "$API_URL/api/health"

# Get project types
curl "$API_URL/api/projects/types"

# Login and get token
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"homeowner@test.com","password":"password123"}' | \
  jq -r '.token')

# Create a project
curl -X POST "$API_URL/api/projects" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "propertyAddress": {
      "line1": "123 Test Street",
      "city": "London",
      "postcode": "SW1A 1AA"
    },
    "projectType": "loft-conversion",
    "requirements": {
      "description": "Convert loft to bedroom with ensuite"
    }
  }'

# Get projects
curl -H "Authorization: Bearer $TOKEN" "$API_URL/api/projects"
```

### 2. **Frontend Integration**

Update your frontend configuration to use the deployed API:

```typescript
// In your frontend config
const API_BASE_URL = 'https://your-api-id.execute-api.eu-west-2.amazonaws.com/production';

// Update API service
const apiService = {
  baseURL: API_BASE_URL,
  // ... rest of your API configuration
};
```

## 🔧 Development Workflow

### Local Development

1. **Start backend**:
   ```bash
   npm run dev  # Simple mode with mocks
   # OR
   npm run dev:full-app  # Full mode with Redis/WebSocket
   ```

2. **Start frontend** (in another terminal):
   ```bash
   npm run frontend:start
   ```

3. **Run both together**:
   ```bash
   npm run dev:full  # Runs both backend and frontend
   ```

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:security      # Security tests

# Run tests in watch mode
npm run test:watch
```

### Building for Production

```bash
# Build TypeScript
npm run build

# Build Lambda package
npm run build:lambda

# Build frontend
npm run frontend:build

# Build everything
npm run build:full
```

## 🚨 Troubleshooting

### Common Issues

1. **AWS Credentials Error**:
   ```bash
   # Check credentials
   aws sts get-caller-identity
   
   # Reconfigure if needed
   aws configure
   ```

2. **Lambda Deployment Fails**:
   ```bash
   # Check if build succeeded
   ls -la dist/
   
   # Rebuild if needed
   npm run build
   ```

3. **API Gateway Timeout**:
   - Lambda cold start can take 10-15 seconds
   - Wait and retry the request

4. **CORS Issues**:
   - Check if your frontend URL is in the CORS configuration
   - Update the Lambda environment variables if needed

### Useful Commands

```bash
# View Lambda logs
aws logs tail /aws/lambda/production-uk-home-api --follow

# Check stack status
aws cloudformation describe-stacks --stack-name production-uk-home-mvp

# Update Lambda code only
aws lambda update-function-code \
  --function-name production-uk-home-api \
  --zip-file fileb://lambda-deployment.zip

# Delete the entire stack
aws cloudformation delete-stack --stack-name production-uk-home-mvp
```

## 📚 Next Steps

1. **Monitor your application**: Use AWS CloudWatch for logs and metrics
2. **Set up CI/CD**: Automate deployments with GitHub Actions
3. **Add custom domain**: Use Route 53 and CloudFront
4. **Scale up**: Move to ECS/Fargate for higher traffic
5. **Add monitoring**: Implement proper logging and alerting

## 🔗 Useful Links

- **AWS Console**: https://console.aws.amazon.com/
- **DynamoDB Console**: https://console.aws.amazon.com/dynamodb/
- **Lambda Console**: https://console.aws.amazon.com/lambda/
- **API Gateway Console**: https://console.aws.amazon.com/apigateway/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/

This guide should get you up and running with both understanding the codebase and deploying the MVP version to AWS!