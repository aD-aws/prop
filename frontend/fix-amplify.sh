#!/bin/bash

echo "🔧 Fixing AWS Amplify installation..."

# Remove existing node_modules and package-lock.json
echo "📦 Cleaning existing dependencies..."
rm -rf node_modules package-lock.json

# Clear npm cache
echo "🧹 Clearing npm cache..."
npm cache clean --force

# Install dependencies with legacy peer deps
echo "⬇️ Installing dependencies..."
npm install --legacy-peer-deps

# Specifically install AWS Amplify v5
echo "🔧 Installing AWS Amplify v5..."
npm install aws-amplify@5.3.12 --legacy-peer-deps

echo "✅ Installation complete!"
echo ""
echo "Now try: npm start"
echo ""
echo "Test credentials:"
echo "- homeowner@test.com / Password123!"
echo "- builder@test.com / Password123!"