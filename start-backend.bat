@echo off
echo 🚀 Starting SyncDoc Backend Server...
echo.

cd /d "%~dp0backend"

:: Check if .env file exists
if not exist ".env" (
    echo ❌ .env file not found!
    echo Please create backend/.env file with your MongoDB connection string
    echo See BACKEND_SETUP.md for details
    pause
    exit /b 1
)

:: Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Installing dependencies first...
    npm install
)

echo ✅ Starting server in development mode...
echo 🌐 Server will be available at: http://localhost:3001
echo 📊 Health check: http://localhost:3001/api/health
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev
