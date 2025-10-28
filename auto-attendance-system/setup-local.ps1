# Alternative Setup Without Docker - Phase 1
# Run each service individually for development

Write-Host "🎓 Auto Attendance System - Local Development Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# Function to check Node.js
function Test-NodeJS {
    Write-Host "📦 Checking Node.js installation..." -ForegroundColor Yellow
    
    try {
        $nodeVersion = node --version
        Write-Host "✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
        
        $npmVersion = npm --version
        Write-Host "✅ npm is installed: $npmVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
        Write-Host "   Download from: https://nodejs.org/" -ForegroundColor Yellow
        exit 1
    }
}

# Function to check Python
function Test-Python {
    Write-Host "🐍 Checking Python installation..." -ForegroundColor Yellow
    
    try {
        $pythonVersion = python --version
        Write-Host "✅ Python is installed: $pythonVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Python is not installed. Please install Python 3.10+ first." -ForegroundColor Red
        Write-Host "   Download from: https://python.org/" -ForegroundColor Yellow
        exit 1
    }
}

# Function to setup backend
function Setup-Backend {
    Write-Host "🚀 Setting up Backend..." -ForegroundColor Yellow
    
    Set-Location backend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created backend .env file" -ForegroundColor Green
    }
    
    Set-Location ..
}

# Function to setup frontend
function Setup-Frontend {
    Write-Host "⚛️ Setting up Frontend..." -ForegroundColor Yellow
    
    Set-Location frontend
    
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created frontend .env file" -ForegroundColor Green
    }
    
    Set-Location ..
}

# Function to setup AI service
function Setup-AIService {
    Write-Host "🤖 Setting up AI Service..." -ForegroundColor Yellow
    
    Set-Location ai_service
    
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created AI service .env file" -ForegroundColor Green
    }
    
    Set-Location ..
}

# Function to start services
function Start-Services {
    Write-Host "🚀 Starting all services..." -ForegroundColor Cyan
    Write-Host "Please open 3 separate terminal windows and run:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Terminal 1 - Backend:" -ForegroundColor Green
    Write-Host "   cd backend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Terminal 2 - Frontend:" -ForegroundColor Green
    Write-Host "   cd frontend" -ForegroundColor White
    Write-Host "   npm run dev" -ForegroundColor White
    Write-Host ""
    Write-Host "Terminal 3 - AI Service:" -ForegroundColor Green
    Write-Host "   cd ai_service" -ForegroundColor White
    Write-Host "   python main.py" -ForegroundColor White
    Write-Host ""
    Write-Host "🌐 Access URLs:" -ForegroundColor Cyan
    Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
    Write-Host "   Backend: http://localhost:5000/api/health" -ForegroundColor White
    Write-Host "   AI Service: http://localhost:8000/ping" -ForegroundColor White
}

# Main function
function Main {
    Write-Host "⚠️  IMPORTANT: Please edit your .env files with MongoDB connection!" -ForegroundColor Red
    Write-Host "   Edit: backend\.env" -ForegroundColor Yellow
    Write-Host "   Set: MONGO_URI=your_mongo_atlas_connection_string" -ForegroundColor Yellow
    Write-Host ""
    
    Test-NodeJS
    Test-Python
    Write-Host ""
    
    Setup-Backend
    Setup-Frontend
    Setup-AIService
    Write-Host ""
    
    Write-Host "✅ Setup complete!" -ForegroundColor Green
    Start-Services
}

# Run main function
Main