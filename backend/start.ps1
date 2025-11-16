# Laundry Buddy Backend Starter
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Laundry Buddy Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:MONGODB_URI = "mongodb://127.0.0.1:27017/laundry_buddy"
$env:PORT = "3000"

# Check Node.js
Write-Host "[1/4] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js not found!" -ForegroundColor Red
    Write-Host "Install from: https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host ""

# Check MongoDB
Write-Host "[2/4] Checking MongoDB..." -ForegroundColor Yellow
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
if ($mongoService -and $mongoService.Status -eq "Running") {
    Write-Host "✓ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "✗ MongoDB is not running!" -ForegroundColor Red
    Write-Host "Attempting to start MongoDB..." -ForegroundColor Yellow
    try {
        Start-Service -Name "MongoDB" -ErrorAction Stop
        Write-Host "✓ MongoDB started" -ForegroundColor Green
    } catch {
        Write-Host "✗ Could not start MongoDB" -ForegroundColor Red
        Write-Host "Please start MongoDB manually" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Install dependencies
Write-Host "[3/4] Checking dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "Installing packages..." -ForegroundColor Yellow
    npm install --silent
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host ""

# Check and free port 3000
Write-Host "[4/4] Checking port 3000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" }
if ($connections) {
    Write-Host "Port 3000 in use. Freeing..." -ForegroundColor Yellow
    foreach ($conn in $connections) {
        Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 1
}
Write-Host "✓ Port 3000 available" -ForegroundColor Green
Write-Host ""

# Start server
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Server..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

npm start
