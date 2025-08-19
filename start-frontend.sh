#!/bin/bash

# UK Home Improvement Platform - Frontend Startup Script
# This script installs dependencies and starts the React frontend

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

log "🚀 Starting UK Home Improvement Platform Frontend"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    error "Please run this script from the project root directory"
fi

# Navigate to frontend directory
cd frontend

log "📦 Installing dependencies..."

# Check if node_modules exists and has aws-amplify
if [ ! -d "node_modules" ] || [ ! -d "node_modules/aws-amplify" ]; then
    log "Installing dependencies with legacy peer deps..."
    
    if ! npm install --legacy-peer-deps; then
        warn "Standard install failed, trying clean install..."
        
        # Clean install
        rm -rf node_modules package-lock.json
        npm cache clean --force
        
        if ! npm install --legacy-peer-deps; then
            error "Failed to install dependencies. Try running: ./fix-frontend-dependencies.sh"
        fi
    fi
else
    log "Dependencies already installed"
fi

log "✅ Dependencies installed successfully"

log "🌐 Starting development server..."
log "Frontend will be available at: http://localhost:3000"
log "API endpoint: https://evfcpp6f15.execute-api.eu-west-2.amazonaws.com/production/api"
log ""
log "Test Credentials:"
log "  Homeowner: homeowner@test.com / Password123!"
log "  Builder: builder@test.com / Password123!"
log ""

# Start the development server
log "🚀 Starting development server..."
log "If you encounter TypeScript errors, the server will try to start anyway."
log "You can also try: npm run start:skip-check"
log ""

# Try normal start first, fallback to skip-check if it fails
if ! timeout 10s npm start 2>/dev/null; then
    warn "Normal start failed or took too long, trying with skip-check..."
    npm run start:skip-check
else
    npm start
fi