#!/bin/bash

# Test script to verify frontend dependencies and configuration

set -e

echo "🧪 Testing UK Home Improvement Platform Frontend"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd frontend

echo "📦 Checking package.json..."
if [ -f "package.json" ]; then
    echo "✅ package.json found"
else
    echo "❌ package.json not found"
    exit 1
fi

echo "🔧 Checking environment configuration..."
if [ -f ".env" ]; then
    echo "✅ .env file found"
    echo "📋 Environment variables:"
    grep "REACT_APP_" .env || echo "No REACT_APP_ variables found"
else
    echo "⚠️ .env file not found, using defaults"
fi

echo "📁 Checking AWS configuration..."
if [ -f "src/aws-config.ts" ]; then
    echo "✅ AWS configuration found"
else
    echo "❌ AWS configuration not found"
    exit 1
fi

echo "🔍 Checking for common dependency issues..."

# Check if node_modules exists
if [ -d "node_modules" ]; then
    echo "✅ node_modules directory exists"
else
    echo "⚠️ node_modules not found, will need to run npm install"
fi

# Check for package-lock.json
if [ -f "package-lock.json" ]; then
    echo "✅ package-lock.json exists"
else
    echo "⚠️ package-lock.json not found"
fi

echo ""
echo "🚀 Ready to start frontend!"
echo ""
echo "To start the development server:"
echo "  cd frontend"
echo "  npm install"
echo "  npm start"
echo ""
echo "Or use the startup script:"
echo "  ./start-frontend.sh"
echo ""
echo "Test credentials:"
echo "  Homeowner: homeowner@test.com / Password123!"
echo "  Builder: builder@test.com / Password123!"