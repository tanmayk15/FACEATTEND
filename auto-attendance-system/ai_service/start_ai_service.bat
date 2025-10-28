@echo off
REM Auto Attendance AI Service - Phase 4 Setup Script (Windows CMD)
echo 🤖 Auto Attendance AI Service - Phase 4 Setup
echo ==================================================

cd /d "c:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\ai_service"
echo 📁 Working directory: %cd%

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python not found. Please install Python 3.8+ first.
    pause
    exit /b 1
)

python --version
echo ✅ Python is available

REM Create virtual environment if it doesn't exist
if not exist "venv" (
    echo 📦 Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo ❌ Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo 🔌 Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo ⬆️ Upgrading pip...
python -m pip install --upgrade pip

REM Install dependencies
echo 📥 Installing AI service dependencies...
echo ⚠️ This may take several minutes for large packages like PyTorch...
pip install -r requirements.txt

if errorlevel 1 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully!

REM Create directories
echo 📁 Creating static directories...
if not exist "static\uploads" mkdir static\uploads
if not exist "static\enrollments" mkdir static\enrollments

REM Display startup info
echo.
echo 🚀 Starting AI Service...
echo Service URL: http://localhost:8000
echo API Documentation: http://localhost:8000/docs
echo Health Check: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop the service
echo.

REM Start the service
python run_ai_service.py

pause