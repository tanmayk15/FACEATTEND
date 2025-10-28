# Auto Attendance System - Backend Startup Script
# Handles environment setup and starts server with mock database fallback

Write-Host "🚀 Starting Auto Attendance Backend Server..." -ForegroundColor Green
Write-Host "📁 Working Directory: $(Get-Location)" -ForegroundColor Cyan

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found in current directory" -ForegroundColor Red
    Write-Host "📍 Current location: $(Get-Location)" -ForegroundColor Yellow
    Write-Host "🔧 Please run this script from the backend directory" -ForegroundColor Yellow
    exit 1
}

# Display environment status
Write-Host "🔧 Environment Configuration:" -ForegroundColor Cyan
Write-Host "   PORT: $env:PORT" -ForegroundColor White
Write-Host "   NODE_ENV: $env:NODE_ENV" -ForegroundColor White
$mongoStatus = if ($env:MONGO_URI) { 'SET' } else { 'NOT SET' }
Write-Host "   MONGO_URI: $mongoStatus" -ForegroundColor White

# Start the server
Write-Host "🌟 Launching server with mock database support..." -ForegroundColor Green
npm start