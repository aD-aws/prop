#!/bin/bash

# Fix Frontend Dependencies Script
# This script resolves common dependency issues with AWS Amplify

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

log "🔧 Fixing Frontend Dependencies for UK Home Improvement Platform"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    error "Please run this script from the project root directory"
fi

cd frontend

log "🧹 Cleaning existing dependencies..."

# Remove node_modules and package-lock.json
if [ -d "node_modules" ]; then
    rm -rf node_modules
    log "✅ Removed node_modules"
fi

if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    log "✅ Removed package-lock.json"
fi

# Clear npm cache
npm cache clean --force
log "✅ Cleared npm cache"

log "📦 Installing dependencies..."

# Install dependencies with legacy peer deps to avoid conflicts
if npm install --legacy-peer-deps; then
    log "✅ Dependencies installed successfully"
else
    warn "Standard install failed, trying alternative approach..."
    
    # Try installing aws-amplify specifically first
    npm install aws-amplify@5.3.0 --legacy-peer-deps
    
    # Then install the rest
    npm install --legacy-peer-deps
fi

log "🔍 Verifying AWS Amplify installation..."

# Check if aws-amplify is properly installed
if [ -d "node_modules/aws-amplify" ]; then
    log "✅ AWS Amplify is installed"
    
    # Check version
    AMPLIFY_VERSION=$(npm list aws-amplify --depth=0 2>/dev/null | grep aws-amplify | cut -d'@' -f2 || echo "unknown")
    log "📋 AWS Amplify version: $AMPLIFY_VERSION"
else
    error "❌ AWS Amplify installation failed"
fi

log "🧪 Testing TypeScript compilation..."

# Create a simple test file to verify imports work
cat > test-amplify.ts << 'EOF'
import { Amplify, Auth } from 'aws-amplify';

// Test that imports work
console.log('AWS Amplify imported successfully');

// Test configuration
const testConfig = {
  Auth: {
    region: 'eu-west-2',
    userPoolId: 'test',
    userPoolWebClientId: 'test'
  }
};

Amplify.configure(testConfig);
EOF

# Try to compile the test file
if npx tsc test-amplify.ts --noEmit --skipLibCheck; then
    log "✅ TypeScript compilation successful"
else
    warn "⚠️ TypeScript compilation issues detected"
fi

# Clean up test file
rm -f test-amplify.ts

log "📋 Checking package.json configuration..."

# Verify aws-amplify is in dependencies
if grep -q '"aws-amplify"' package.json; then
    log "✅ aws-amplify found in package.json"
else
    warn "⚠️ aws-amplify not found in package.json"
fi

log "🎯 Final verification..."

# Check if we can import aws-amplify in a Node.js context
if node -e "require('aws-amplify'); console.log('AWS Amplify can be required');" 2>/dev/null; then
    log "✅ AWS Amplify can be imported"
else
    warn "⚠️ AWS Amplify import test failed"
fi

log ""
log "🎉 Frontend dependencies fixed!"
log ""
log "Next steps:"
log "1. Try starting the development server:"
log "   npm start"
log ""
log "2. If you still get TypeScript errors, try:"
log "   npm run start:skip-check"
log ""
log "3. Or use the startup script:"
log "   cd .. && ./start-frontend.sh"
log ""
log "Test credentials:"
log "  Homeowner: homeowner@test.com / Password123!"
log "  Builder: builder@test.com / Password123!"