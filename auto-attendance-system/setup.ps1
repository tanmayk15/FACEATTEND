# Auto Attendance System - Phase 1 Setup Script (Windows)
# PowerShell script to help set up the development environment

Write-Host "🎓 Auto Attendance System - Phase 1 Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Function to copy environment files
function Copy-EnvFiles {
    Write-Host "📋 Setting up environment files..." -ForegroundColor Yellow
    
    # Root environment
    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Created root .env file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Root .env file already exists" -ForegroundColor Yellow
    }
    
    # Backend environment
    if (-not (Test-Path "backend\.env")) {
        Copy-Item "backend\.env.example" "backend\.env"
        Write-Host "✅ Created backend .env file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Backend .env file already exists" -ForegroundColor Yellow
    }
    
    # Frontend environment  
    if (-not (Test-Path "frontend\.env")) {
        Copy-Item "frontend\.env.example" "frontend\.env"
        Write-Host "✅ Created frontend .env file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Frontend .env file already exists" -ForegroundColor Yellow
    }
    
    # AI Service environment
    if (-not (Test-Path "ai_service\.env")) {
        Copy-Item "ai_service\.env.example" "ai_service\.env"
        Write-Host "✅ Created ai_service .env file" -ForegroundColor Green
    } else {
        Write-Host "⚠️  AI service .env file already exists" -ForegroundColor Yellow
    }
}

# Function to check Docker
function Test-Docker {
    Write-Host "🐳 Checking Docker installation..." -ForegroundColor Yellow
    
    try {
        $dockerVersion = docker --version
        Write-Host "✅ Docker is installed: $dockerVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
        exit 1
    }
    
    try {
        $composeVersion = docker-compose --version
        Write-Host "✅ Docker Compose is installed: $composeVersion" -ForegroundColor Green
    } catch {
        Write-Host "❌ Docker Compose is not installed. Please install Docker Compose first." -ForegroundColor Red
        exit 1
    }
}

# Function to build services
function Build-Services {
    Write-Host "🔨 Building Docker services..." -ForegroundColor Yellow
    
    $buildResult = docker-compose build
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All services built successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Build failed. Please check the error messages above." -ForegroundColor Red
        exit 1
    }
}

# Function to start services
function Start-Services {
    Write-Host "🚀 Starting services..." -ForegroundColor Yellow
    
    docker-compose up -d
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ All services started successfully" -ForegroundColor Green
        Write-Host ""
        Write-Host "🌐 Access your services:" -ForegroundColor Cyan
        Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
        Write-Host "   Backend Health: http://localhost:5000/api/health" -ForegroundColor White
        Write-Host "   AI Service Health: http://localhost:8000/ping" -ForegroundColor White
        Write-Host "   AI Service Docs: http://localhost:8000/docs" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to start services. Please check the error messages above." -ForegroundColor Red
        exit 1
    }
}

# Function to show logs info
function Show-LogsInfo {
    Write-Host "📊 Service logs commands:" -ForegroundColor Cyan
    Write-Host "   Backend logs: docker-compose logs backend" -ForegroundColor White
    Write-Host "   Frontend logs: docker-compose logs frontend" -ForegroundColor White
    Write-Host "   AI Service logs: docker-compose logs ai_service" -ForegroundColor White
    Write-Host "   All logs: docker-compose logs" -ForegroundColor White
}

# Main setup flow
function Main {
    Write-Host "Starting setup process..." -ForegroundColor Cyan
    Write-Host ""
    
    Copy-EnvFiles
    Write-Host ""
    
    Test-Docker
    Write-Host ""
    
    Write-Host "⚠️  IMPORTANT: Please edit your .env files with your MongoDB connection string!" -ForegroundColor Red
    Write-Host "   Edit: .env and backend\.env" -ForegroundColor Yellow
    Write-Host "   Replace: MONGO_URI=your_mongo_atlas_connection_string" -ForegroundColor Yellow
    Write-Host ""
    
    $response = Read-Host "Have you configured your MongoDB URI? (y/n)"
    
    if ($response -eq "y" -or $response -eq "Y") {
        Build-Services
        Write-Host ""
        Start-Services
        Write-Host ""
        Show-LogsInfo
        Write-Host ""
        Write-Host "🎉 Phase 1 setup complete!" -ForegroundColor Green
        Write-Host "🔗 Visit http://localhost:3000 to see the service dashboard" -ForegroundColor Cyan
    } else {
        Write-Host "Please configure your MongoDB URI first, then run:" -ForegroundColor Yellow
        Write-Host "   docker-compose build" -ForegroundColor White
        Write-Host "   docker-compose up" -ForegroundColor White
    }
}

# Run main function
Main