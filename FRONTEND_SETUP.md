# Frontend Setup Guide

## Quick Fix for "Cannot find module 'aws-amplify'" Error

### 🚀 **Fastest Solution**

Run the automated fix script:
```bash
./fix-frontend-dependencies.sh
```

### 🔧 **Manual Fix Steps**

1. **Clean Dependencies**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm cache clean --force
   ```

2. **Install with Legacy Peer Deps**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Start the Frontend**
   ```bash
   npm start
   # or if TypeScript errors persist:
   npm run start:skip-check
   ```

### 🎯 **Alternative Approaches**

#### Option 1: Use Startup Script
```bash
./start-frontend.sh
```

#### Option 2: Install Specific AWS Amplify Version
```bash
cd frontend
npm install aws-amplify@5.3.0 --legacy-peer-deps
npm start
```

#### Option 3: Skip TypeScript Preflight Check
```bash
cd frontend
SKIP_PREFLIGHT_CHECK=true npm start
```

#### Option 4: Use Package.json Scripts
```bash
cd frontend
npm run install:clean  # Clean install
npm run start:force    # Start with all checks disabled
```

### 🔍 **Verify Installation**

Check if AWS Amplify is properly installed:
```bash
cd frontend
ls node_modules/ | grep amplify
npm list aws-amplify
```

### 🧪 **Test Credentials**

Once the frontend starts, use these test accounts:
- **Homeowner**: `homeowner@test.com` / `Password123!`
- **Builder**: `builder@test.com` / `Password123!`

### ❓ **Still Having Issues?**

1. **Check Node.js Version**
   ```bash
   node --version  # Should be 16+ 
   npm --version   # Should be 8+
   ```

2. **Try Different Node Version**
   ```bash
   # If using nvm
   nvm use 18
   npm install --legacy-peer-deps
   ```

3. **Use Fallback Authentication**
   ```bash
   cd frontend/src/contexts
   mv AuthContext.tsx AuthContext.amplify.tsx
   mv AuthContext.fallback.tsx AuthContext.tsx
   ```

4. **Check Detailed Logs**
   ```bash
   cd frontend
   npm install --legacy-peer-deps --verbose
   ```

### 📋 **Expected Behavior**

When working correctly:
- ✅ Frontend starts on `http://localhost:3000`
- ✅ No "Cannot find module" errors
- ✅ Login page loads without TypeScript errors
- ✅ Can authenticate with test credentials
- ✅ API calls work to AWS Lambda backend

### 🆘 **Get Help**

If none of these solutions work:
1. Check `frontend/TROUBLESHOOTING.md` for more solutions
2. Run `./test-frontend.sh` to verify configuration
3. Check browser console for detailed error messages
4. Verify AWS Cognito configuration in AWS Console