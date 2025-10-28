# Auto Attendance System - Server Startup Script
# This script starts both backend and frontend services

Write-Host "🚀 Auto Attendance System - Starting Services..." -ForegroundColor Green

# Set working directory
$BackendPath = "C:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\backend"
$FrontendPath = "C:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\frontend"

# Start Backend
Write-Host "📡 Starting Backend Server..." -ForegroundColor Cyan
Set-Location $BackendPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; Write-Host 'Backend starting...' -ForegroundColor Yellow; node src/server.js"

# Wait for backend to start
Start-Sleep -Seconds 5

# Start Frontend  
Write-Host "🌐 Starting Frontend Server..." -ForegroundColor Cyan
Set-Location $FrontendPath
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; Write-Host 'Frontend starting...' -ForegroundColor Yellow; npm run dev"

Write-Host "✅ Both services should be starting in separate windows..." -ForegroundColor Green
Write-Host "🔗 Backend: http://localhost:5001" -ForegroundColor White
Write-Host "🔗 Frontend: http://localhost:3000" -ForegroundColor White

# Test connections after startup
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "🧪 Testing Backend Connection..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5001/api/health" -TimeoutSec 5
    Write-Host "✅ Backend is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "🧪 Testing Frontend Connection..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 5 -UseBasicParsing
    Write-Host "✅ Frontend is running!" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend connection failed: $($_.Exception.Message)" -ForegroundColor Red
}

Read-Host "Press Enter to close this window"