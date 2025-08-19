# Frontend Troubleshooting Guide

## Common npm start Issues

### 1. Dependency Conflicts
If you're getting dependency errors, try:
```bash
npm run fix:deps
```

### 2. AWS Amplify Version Issues
If you see Amplify import errors:
```bash
npm uninstall aws-amplify
npm install aws-amplify@^6.0.0
```

### 3. React Scripts Issues
If React Scripts fails to start:
```bash
npm run start:skip-check
```

### 4. Complete Clean Install
If all else fails:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --legacy-peer-deps
npm start
```

### 5. Environment Variables
Make sure your `.env` file exists with:
```
SKIP_PREFLIGHT_CHECK=true
GENERATE_SOURCEMAP=false
REACT_APP_API_URL=https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api
```

## Test Credentials
- **Homeowner**: homeowner@test.com / Password123!
- **Builder**: builder@test.com / Password123!

## API Endpoints
- **Health**: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api/health
- **Projects**: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api/projects

## Quick Test
Test the API directly:
```bash
curl https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api/health
```