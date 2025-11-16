#!/bin/bash

echo "========================================"
echo "  Laundry Buddy Backend Setup"
echo "========================================"
echo ""

cd backend

echo "[1/3] Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed!"
    echo "Please download and install Node.js from: https://nodejs.org/"
    exit 1
fi
echo "Node.js found!"
node --version
echo ""

echo "[2/3] Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install dependencies!"
    exit 1
fi
echo "Dependencies installed successfully!"
echo ""

echo "[3/3] Starting backend server..."
echo ""
echo "========================================"
echo "  Backend is starting..."
echo "  URL: http://localhost:3000"
echo "  Press Ctrl+C to stop the server"
echo "========================================"
echo ""

npm start
