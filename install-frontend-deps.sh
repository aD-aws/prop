#!/bin/bash

# Simple Frontend Dependencies Installation Script

set -e

echo "🔧 Installing UK Home Improvement Platform Frontend Dependencies"

# Check if we're in the right directory
if [ ! -f "frontend/package.json" ]; then
    echo "❌ Please run this script from the project root directory"
    exit 1
fi

cd frontend

echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo "🔍 Verifying AWS Amplify..."
if [ -d "node_modules/aws-amplify" ]; then
    echo "✅ AWS Amplify installed successfully"
else
    echo "⚠️ Installing AWS Amplify manually..."
    npm install aws-amplify@5.3.0 --legacy-peer-deps
fi

echo "✅ Dependencies installed!"
echo ""
echo "🚀 To start the frontend:"
echo "  cd frontend"
echo "  npm start"
echo ""
echo "If you get TypeScript errors, try:"
echo "  SKIP_PREFLIGHT_CHECK=true npm start"