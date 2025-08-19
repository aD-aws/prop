# UK Home Improvement Platform - Frontend

React.js frontend application with AWS Cognito authentication.

## Quick Start

### Option 1: Use Installation Script (Recommended)
```bash
# From project root
./install-frontend-deps.sh
cd frontend && npm start
```

### Option 2: Manual Installation
```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

### Option 3: Skip TypeScript Checks
```bash
cd frontend
npm run start:skip-check
```

## Common Issues

### "Cannot find module 'aws-amplify'"
This is a common TypeScript/dependency issue. Try:

1. **Use the installation script**: `./install-frontend-deps.sh`
2. **Reinstall dependencies**: `rm -rf node_modules package-lock.json && npm install --legacy-peer-deps`
3. **Skip TypeScript checks**: `npm run start:skip-check`

### Dependency Conflicts
If you get peer dependency warnings:
```bash
npm install --legacy-peer-deps
```

## Configuration

The app uses environment variables from `.env`:
- `REACT_APP_API_URL` - API endpoint
- `REACT_APP_USER_POOL_ID` - Cognito User Pool ID
- `REACT_APP_USER_POOL_CLIENT_ID` - Cognito Client ID
- `REACT_APP_IDENTITY_POOL_ID` - Cognito Identity Pool ID

## Test Credentials

- **Homeowner**: homeowner@test.com / Password123!
- **Builder**: builder@test.com / Password123!

## Available Scripts

- `npm start` - Start development server
- `npm run start:skip-check` - Start with TypeScript checks disabled
- `npm run build` - Build for production
- `npm test` - Run tests

## Troubleshooting

See `TROUBLESHOOTING.md` for detailed solutions to common issues.