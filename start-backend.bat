@echo off
setlocal enabledelayedexpansion
cls

echo ========================================
echo   Laundry Buddy Backend Setup
echo ========================================
echo.

cd /d "%~dp0backend"

echo [1/4] Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js found: 
node --version
echo.

echo [2/4] Checking MongoDB...
sc query MongoDB | findstr "RUNNING" >nul 2>&1
if errorlevel 1 (
    echo WARNING: MongoDB service is not running!
    echo Attempting to start MongoDB...
    net start MongoDB >nul 2>&1
    if errorlevel 1 (
        echo ERROR: Could not start MongoDB. Please start it manually.
        pause
        exit /b 1
    )
)
echo ✓ MongoDB is running
echo.

echo [3/4] Installing dependencies...
if not exist "node_modules\" (
    echo Installing packages for the first time...
    call npm install --silent
) else (
    echo ✓ Dependencies already installed
)
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo.

echo [4/4] Checking if port 3000 is available...
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if not errorlevel 1 (
    echo Port 3000 is already in use!
    echo Attempting to free the port...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
        echo Killing process %%a...
        taskkill /PID %%a /F >nul 2>&1
    )
    timeout /t 2 >nul
)
echo ✓ Port 3000 is available
echo.

echo ========================================
echo   Starting Backend Server...
echo ========================================
echo.

call npm start
