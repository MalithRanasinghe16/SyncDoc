@echo off
echo 🚀 Starting SyncDoc Full Stack Application...
echo.

:: Start Backend
echo 📦 Starting Backend Server...
start "SyncDoc Backend" cmd /k "cd /d \"d:\PlayGround\Document Editor\SyncDoc\backend\" && npm run dev"

:: Wait a moment for backend to start
timeout /t 3 > nul

:: Start Frontend
echo 🌐 Starting Frontend Development Server...
start "SyncDoc Frontend" cmd /k "cd /d \"d:\PlayGround\Document Editor\SyncDoc\project\" && npm run dev"

echo.
echo ✅ Both servers are starting...
echo 🔗 Backend API: http://localhost:3001
echo 🌐 Frontend App: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul
