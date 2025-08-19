@echo off
echo 🔧 Fixing AWS Amplify installation...

echo 📦 Cleaning existing dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json

echo 🧹 Clearing npm cache...
npm cache clean --force

echo ⬇️ Installing dependencies...
npm install --legacy-peer-deps

echo 🔧 Installing AWS Amplify v5...
npm install aws-amplify@5.3.12 --legacy-peer-deps

echo ✅ Installation complete!
echo.
echo Now try: npm start
echo.
echo Test credentials:
echo - homeowner@test.com / Password123!
echo - builder@test.com / Password123!