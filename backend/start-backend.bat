@echo off
setlocal enabledelayedexpansion
cd /d %~dp0
cls

if not defined MONGODB_URI set MONGODB_URI=mongodb://127.0.0.1:27017/laundry_buddy
if not defined PORT set PORT=3000

echo ========================================
echo   Laundry Buddy Backend (Direct)
echo ========================================
echo MongoDB: %MONGODB_URI%
echo Port: %PORT%
echo.

echo [1/3] Installing dependencies...
if not exist "node_modules\" (
    call npm install --silent
) else (
    echo ✓ Dependencies OK
)
echo.

echo [2/3] Checking port %PORT%...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :%PORT% ^| findstr LISTENING') do (
  echo Killing old process %%a...
  taskkill /PID %%a /F >nul 2>&1
)
timeout /t 1 >nul
echo ✓ Port ready
echo.

echo [3/3] Starting server...
echo.
call npm start

endlocal
