@echo off
echo 🚀 Setting up SyncDoc Backend...
echo.

:: Check if Node.js is installed
node --version > nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed

:: Navigate to backend directory
cd /d "%~dp0backend"

:: Install dependencies
echo 📦 Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

echo.
echo 🎯 Next steps:
echo 1. Set up your MongoDB Atlas cluster
echo 2. Update the MONGODB_URI in backend/.env with your connection string
echo 3. Update the JWT_SECRET in backend/.env with a secure random string
echo 4. Run 'npm run dev' in the backend directory to start the server
echo.

pause
