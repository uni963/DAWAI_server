@echo off
REM ================================================================
REM Mock DiffSinger Server Startup Script (Windows)
REM ================================================================
REM
REM Purpose: Start the Mock DiffSinger server for DAWAI Voice Track
REM Port: 8001
REM Dependencies: Python 3.x, FastAPI, uvicorn, numpy
REM
REM Usage:
REM   Double-click this file or run: start_mock_server.bat
REM
REM ================================================================

echo.
echo ================================================================
echo       Mock DiffSinger Server - Startup Script
echo ================================================================
echo.
echo [INFO] Starting Mock DiffSinger Server...
echo [INFO] Port: 8001
echo [INFO] API Docs: http://localhost:8001/docs
echo.

REM Change to script directory
cd /d "%~dp0"

REM Check if Python is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo [ERROR] Please install Python 3.x from https://www.python.org/
    pause
    exit /b 1
)

echo [OK] Python detected:
python --version

REM Check if required packages are installed
echo.
echo [INFO] Checking dependencies...
python -c "import fastapi, uvicorn, numpy" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Required packages not found. Installing...
    pip install fastapi uvicorn numpy
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies
        pause
        exit /b 1
    )
)

echo [OK] All dependencies satisfied
echo.

REM Start the server
echo ================================================================
echo       Starting Server...
echo ================================================================
echo.
echo [TIP] Press Ctrl+C to stop the server
echo [TIP] Keep this window open while using Voice Track features
echo.

python mock_diffsinger_server.py

REM If server exits
echo.
echo ================================================================
echo       Server Stopped
echo ================================================================
pause
