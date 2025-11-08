#!/bin/bash
# ================================================================
# Mock DiffSinger Server Startup Script (Linux/macOS)
# ================================================================
#
# Purpose: Start the Mock DiffSinger server for DAWAI Voice Track
# Port: 8001
# Dependencies: Python 3.x, FastAPI, uvicorn, numpy
#
# Usage:
#   chmod +x start_mock_server.sh
#   ./start_mock_server.sh
#
# ================================================================

echo ""
echo "================================================================"
echo "       Mock DiffSinger Server - Startup Script"
echo "================================================================"
echo ""
echo "[INFO] Starting Mock DiffSinger Server..."
echo "[INFO] Port: 8001"
echo "[INFO] API Docs: http://localhost:8001/docs"
echo ""

# Change to script directory
cd "$(dirname "$0")"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python 3 is not installed or not in PATH"
    echo "[ERROR] Please install Python 3.x from your package manager"
    exit 1
fi

echo "[OK] Python detected: $(python3 --version)"

# Check if required packages are installed
echo ""
echo "[INFO] Checking dependencies..."
if ! python3 -c "import fastapi, uvicorn, numpy" 2>/dev/null; then
    echo "[WARNING] Required packages not found. Installing..."
    pip3 install fastapi uvicorn numpy
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to install dependencies"
        exit 1
    fi
fi

echo "[OK] All dependencies satisfied"
echo ""

# Start the server
echo "================================================================"
echo "       Starting Server..."
echo "================================================================"
echo ""
echo "[TIP] Press Ctrl+C to stop the server"
echo "[TIP] Keep this terminal open while using Voice Track features"
echo ""

python3 mock_diffsinger_server.py

# If server exits
echo ""
echo "================================================================"
echo "       Server Stopped"
echo "================================================================"
