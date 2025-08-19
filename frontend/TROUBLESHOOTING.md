# Frontend Troubleshooting Guide

## Common Issues and Solutions

### 1. "Cannot find module 'aws-amplify'" Error

**Problem**: TypeScript cannot find the aws-amplify module

**Solutions**:
```bash
# Option 1: Use the fix script
./install-frontend-deps.sh

# Option 2: Manual fix
cd frontend
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Option 3: Skip TypeScript checks
cd frontend
SKIP_PREFLIGHT_CHECK=true npm start

# Option 4: Use the skip-check script
cd frontend
npm run start:skip-check
```

### 2. Dependencies Installation Issues

**Problem**: `npm install` fails or shows dependency conflicts

**Solutions**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall dependencies
npm install

# If still failing, try with legacy peer deps
npm install --legacy-peer-deps
```

### 2. AWS Amplify Import Errors

**Problem**: Cannot resolve 'aws-amplify/auth' or similar import errors

**Solutions**:
```bash
# Install specific Amplify packages
npm install aws-amplify @aws-amplify/auth @aws-amplify/core

# Or install the full Amplify library
npm install aws-amplify@latest
```

### 3. TypeScript Compilation Errors

**Problem**: TypeScript errors related to Amplify types

**Solutions**:
```bash
# Install Amplify types
npm install --save-dev @types/aws-amplify

# Or ignore TypeScript errors temporarily
export SKIP_PREFLIGHT_CHECK=true
npm start
```

### 4. Environment Variables Not Loading

**Problem**: AWS configuration not found

**Solutions**:
1. Ensure `.env` file exists in `frontend/` directory
2. Restart the development server after adding environment variables
3. Check that variables start with `REACT_APP_`

### 5. CORS Issues

**Problem**: API calls blocked by CORS policy

**Solutions**:
1. Verify API endpoint is correct in `.env`
2. Check that API Gateway has CORS enabled
3. Ensure frontend is running on correct port (3000)

### 6. Authentication Errors

**Problem**: Cognito authentication not working

**Solutions**:
1. Verify Cognito configuration in `aws-config.ts`
2. Check that User Pool and Client IDs are correct
3. Ensure test users exist in Cognito User Pool

## Quick Start Commands

```bash
# Install dependencies
cd frontend && npm install

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

## Test Credentials

- **Homeowner**: homeowner@test.com / Password123!
- **Builder**: builder@test.com / Password123!

## API Endpoint

- **Production**: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api

## Support

If issues persist:
1. Check browser console for detailed error messages
2. Verify AWS Cognito configuration in AWS Console
3. Test API endpoints directly using curl or Postman
4. Check CloudWatch logs for Lambda function errors