#!/bin/bash

# Auto Attendance System - Phase 1 Setup Script
# This script helps set up the development environment

echo "🎓 Auto Attendance System - Phase 1 Setup"
echo "=========================================="

# Function to copy environment files
copy_env_files() {
    echo "📋 Setting up environment files..."
    
    # Root environment
    if [ ! -f .env ]; then
        cp .env.example .env
        echo "✅ Created root .env file"
    else
        echo "⚠️  Root .env file already exists"
    fi
    
    # Backend environment
    if [ ! -f backend/.env ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend .env file"
    else
        echo "⚠️  Backend .env file already exists"
    fi
    
    # Frontend environment  
    if [ ! -f frontend/.env ]; then
        cp frontend/.env.example frontend/.env
        echo "✅ Created frontend .env file"
    else
        echo "⚠️  Frontend .env file already exists"
    fi
    
    # AI Service environment
    if [ ! -f ai_service/.env ]; then
        cp ai_service/.env.example ai_service/.env
        echo "✅ Created ai_service .env file"
    else
        echo "⚠️  AI service .env file already exists"
    fi
}

# Function to check Docker
check_docker() {
    echo "🐳 Checking Docker installation..."
    if command -v docker &> /dev/null; then
        echo "✅ Docker is installed"
        docker --version
    else
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose is installed"
        docker-compose --version
    else
        echo "❌ Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Function to build services
build_services() {
    echo "🔨 Building Docker services..."
    docker-compose build
    
    if [ $? -eq 0 ]; then
        echo "✅ All services built successfully"
    else
        echo "❌ Build failed. Please check the error messages above."
        exit 1
    fi
}

# Function to start services
start_services() {
    echo "🚀 Starting services..."
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ All services started successfully"
        echo ""
        echo "🌐 Access your services:"
        echo "   Frontend: http://localhost:3000"
        echo "   Backend Health: http://localhost:5000/api/health"
        echo "   AI Service Health: http://localhost:8000/ping"
        echo "   AI Service Docs: http://localhost:8000/docs"
    else
        echo "❌ Failed to start services. Please check the error messages above."
        exit 1
    fi
}

# Function to show logs
show_logs() {
    echo "📊 Service logs:"
    echo "Backend logs: docker-compose logs backend"
    echo "Frontend logs: docker-compose logs frontend"  
    echo "AI Service logs: docker-compose logs ai_service"
    echo "All logs: docker-compose logs"
}

# Main setup flow
main() {
    echo "Starting setup process..."
    echo ""
    
    copy_env_files
    echo ""
    
    check_docker
    echo ""
    
    echo "⚠️  IMPORTANT: Please edit your .env files with your MongoDB connection string!"
    echo "   Edit: .env and backend/.env"
    echo "   Replace: MONGO_URI=your_mongo_atlas_connection_string"
    echo ""
    
    read -p "Have you configured your MongoDB URI? (y/n): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        build_services
        echo ""
        start_services
        echo ""
        show_logs
        echo ""
        echo "🎉 Phase 1 setup complete!"
        echo "🔗 Visit http://localhost:3000 to see the service dashboard"
    else
        echo "Please configure your MongoDB URI first, then run:"
        echo "   docker-compose build"
        echo "   docker-compose up"
    fi
}

# Run main function
main