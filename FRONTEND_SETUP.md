# Frontend Setup Guide

## Quick Fix for "Cannot find module 'aws-amplify'" Error

### Option 1: Use the Fix Script (Recommended)
```bash
./fix-frontend-deps.sh
```

### Option 2: Manual Fix
```bash
cd frontend

# Clean everything
rm -rf node_modules package-lock.json
npm cache clean --force

# Install with legacy peer deps
npm install --legacy-peer-deps

# Start the app
npm start
```

### Option 3: If Still Having Issues
```bash
cd frontend

# Use the clean install script
npm run install:clean

# Or try with skip preflight check
npm run start:skip-check
```

## Common Solutions

### 1. Dependency Conflicts
If you get peer dependency warnings:
```bash
cd frontend
npm install --legacy-peer-deps
```

### 2. TypeScript Errors
If TypeScript compilation fails:
```bash
cd frontend
npm run start:skip-check
```

### 3. Cache Issues
If modules are not found:
```bash
cd frontend
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### 4. Node Version Issues
Make sure you're using Node.js 16 or higher:
```bash
node --version  # Should be 16.x or higher
```

## Verification Steps

1. **Check if aws-amplify is installed:**
   ```bash
   cd frontend
   npm list aws-amplify
   ```

2. **Test TypeScript compilation:**
   ```bash
   cd frontend
   npx tsc --noEmit
   ```

3. **Start the development server:**
   ```bash
   cd frontend
   npm start
   ```

## Expected Behavior

- Frontend should start on `http://localhost:3000`
- You should see the UK Home Improvement Platform login page
- Test credentials:
  - Homeowner: `homeowner@test.com` / `Password123!`
  - Builder: `builder@test.com` / `Password123!`

## Troubleshooting

### Error: "Module not found: Can't resolve 'aws-amplify'"
**Solution:** Run the fix script or manually clean and reinstall dependencies

### Error: "There might be a problem with the project dependency tree"
**Solution:** Use `npm run start:skip-check` or install with `--legacy-peer-deps`

### Error: TypeScript compilation errors
**Solution:** Use `SKIP_PREFLIGHT_CHECK=true npm start`

### Error: Port 3000 already in use
**Solution:** Kill the process using port 3000 or use a different port:
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or start on different port
PORT=3001 npm start
```

## Alternative: Use Fallback Authentication

If AWS Amplify continues to cause issues, you can temporarily use the fallback authentication:

1. Rename the current AuthContext:
   ```bash
   cd frontend/src/contexts
   mv AuthContext.tsx AuthContext.amplify.tsx
   mv AuthContext.fallback.tsx AuthContext.tsx
   ```

2. This will use mock authentication that works without AWS Amplify

3. Test credentials remain the same:
   - `homeowner@test.com` / `Password123!`
   - `builder@test.com` / `Password123!`

## Support

If none of these solutions work:
1. Check the browser console for detailed error messages
2. Verify Node.js version is 16 or higher
3. Try creating a fresh React app to test if the issue is environment-related
4. Check the `frontend/TROUBLESHOOTING.md` file for more solutions