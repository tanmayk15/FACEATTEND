# Auto Attendance AI Service - Phase 4 Setup Script
# Configures Python environment and starts the AI service

Write-Host "🤖 Auto Attendance AI Service - Phase 4 Setup" -ForegroundColor Cyan
Write-Host "=" * 50

# Change to AI service directory
$aiServicePath = "c:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\ai_service"
Set-Location $aiServicePath

Write-Host "📁 Working directory: $aiServicePath" -ForegroundColor Green

# Check if Python is available
try {
    $pythonVersion = python --version 2>$null
    Write-Host "🐍 Python version: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.8+ first." -ForegroundColor Red
    exit 1
}

# Check if virtual environment exists
if (-not (Test-Path "venv")) {
    Write-Host "📦 Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create virtual environment" -ForegroundColor Red
        exit 1
    }
}

# Activate virtual environment
Write-Host "🔌 Activating virtual environment..." -ForegroundColor Yellow
& ".\venv\Scripts\Activate.ps1"

# Upgrade pip
Write-Host "⬆️ Upgrading pip..." -ForegroundColor Yellow
python -m pip install --upgrade pip

# Install dependencies
Write-Host "📥 Installing AI service dependencies..." -ForegroundColor Yellow
Write-Host "⚠️ This may take several minutes for large packages like PyTorch..." -ForegroundColor Cyan

pip install -r requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green

# Create required directories
Write-Host "📁 Creating static directories..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path "static/uploads" | Out-Null
New-Item -ItemType Directory -Force -Path "static/enrollments" | Out-Null

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ .env file not found, using default configuration" -ForegroundColor Yellow
} else {
    Write-Host "✅ Environment configuration loaded" -ForegroundColor Green
}

# Display startup information
Write-Host "`n🚀 Starting AI Service..." -ForegroundColor Cyan
Write-Host "Service URL: http://localhost:8000" -ForegroundColor Green
Write-Host "API Documentation: http://localhost:8000/docs" -ForegroundColor Green
Write-Host "Health Check: http://localhost:8000/health" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop the service`n" -ForegroundColor Yellow

# Start the AI service
try {
    python run_ai_service.py
} catch {
    Write-Host "❌ Failed to start AI service: $_" -ForegroundColor Red
    exit 1
}