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

# Install dependencies
if ! npm install; then
    error "Failed to install dependencies"
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
npm start