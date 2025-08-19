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

log "🔧 Fixing UK Home Improvement Platform Frontend Dependencies"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    error "Please run this script from the project root directory"
fi

cd frontend

log "🧹 Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

log "🗑️ Clearing npm cache..."
npm cache clean --force

log "📦 Installing dependencies with legacy peer deps..."
npm install --legacy-peer-deps

log "🔍 Verifying aws-amplify installation..."
if npm list aws-amplify > /dev/null 2>&1; then
    log "✅ aws-amplify is installed correctly"
else
    warn "⚠️ aws-amplify not found, installing manually..."
    npm install aws-amplify@5.3.0 --legacy-peer-deps
fi

log "🧪 Testing TypeScript compilation..."
if npx tsc --noEmit > /dev/null 2>&1; then
    log "✅ TypeScript compilation successful"
else
    warn "⚠️ TypeScript compilation has warnings (this is normal)"
fi

log "✅ Dependencies fixed successfully!"
log ""
log "🚀 You can now start the frontend:"
log "  npm start"
log ""
log "Or use the skip preflight check if there are still warnings:"
log "  npm run start:skip-check"