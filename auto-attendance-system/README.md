# 🎓 Auto Attendance System - Phase 1

A comprehensive AI-powered attendance management system built with **MERN Stack + FastAPI + Docker**.

## 🏗️ Phase 1: Infrastructure & Architecture Setup

This phase establishes the foundation for a multi-service architecture with Docker orchestration.

### 🎯 Phase 1 Objectives ✅

- ✅ **Dockerized Multi-Service Setup**
- ✅ **Backend Service** (Node.js + Express + MongoDB)
- ✅ **Frontend Service** (React + Vite + Tailwind CSS)
- ✅ **AI Service** (Python + FastAPI)
- ✅ **Service Communication & Health Checks**
- ✅ **Environment Configuration**

---

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   AI Service    │
│  React + Vite   │◄──►│ Node.js + Express│◄──►│ Python + FastAPI│
│   Port: 3000    │    │   Port: 5000    │    │   Port: 8000    │
│                 │    │                 │    │                 │
│ • Tailwind CSS  │    │ • MongoDB Atlas │    │ • Health Checks │
│ • Health Checks │    │ • Health Checks │    │ • CORS Enabled  │
│ • Service Status│    │ • CORS + Helmet │    │ • Future AI/ML  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 📁 Project Structure

```
auto-attendance-system/
├── 📁 backend/                 # Node.js + Express API
│   ├── 📁 src/
│   │   ├── app.js              # Express app configuration
│   │   └── server.js           # Server startup
│   ├── package.json            # Node.js dependencies
│   ├── Dockerfile              # Backend container config
│   └── .env.example            # Environment template
│
├── 📁 frontend/                # React + Vite UI
│   ├── 📁 src/
│   │   ├── App.jsx             # Main React component
│   │   ├── main.jsx            # React entry point
│   │   ├── index.css           # Tailwind styles
│   │   └── App.css             # Component styles
│   ├── package.json            # Frontend dependencies
│   ├── vite.config.js          # Vite configuration
│   ├── tailwind.config.js      # Tailwind setup
│   ├── Dockerfile              # Frontend container config
│   └── .env.example            # Environment template
│
├── 📁 ai_service/              # Python + FastAPI AI
│   ├── main.py                 # FastAPI application
│   ├── requirements.txt        # Python dependencies
│   ├── Dockerfile              # AI service container config
│   └── .env.example            # Environment template
│
├── docker-compose.yml          # Multi-service orchestration
├── .env.example                # Global environment template
└── README.md                   # This file
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Docker & Docker Compose** installed
- **MongoDB Atlas** account (or local MongoDB)
- **Git** for version control

### 1️⃣ Clone and Setup

```bash
# Navigate to project directory
cd auto-attendance-system

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
cp ai_service/.env.example ai_service/.env
```

### 2️⃣ Configure Environment

Edit `.env` files with your MongoDB Atlas connection string:

```env
# .env (root)
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/auto_attendance?retryWrites=true&w=majority
```

### 3️⃣ Build and Run

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Or run in background
docker-compose up -d
```

### 4️⃣ Verify Setup

Once all services are running, verify the following endpoints:

| Service | URL | Expected Response |
|---------|-----|-------------------|
| **Frontend** | http://localhost:3000 | React app with service status |
| **Backend** | http://localhost:5000/api/health | `{"status": "ok", "service": "backend"}` |
| **AI Service** | http://localhost:8000/ping | `{"status": "ok", "service": "ai_service"}` |
| **AI Docs** | http://localhost:8000/docs | FastAPI documentation |

---

## 🔧 Development Commands

### Backend (Node.js)
```bash
cd backend
npm install           # Install dependencies
npm run dev           # Start with nodemon
npm start             # Production start
```

### Frontend (React)
```bash
cd frontend
npm install           # Install dependencies
npm run dev           # Start Vite dev server
npm run build         # Build for production
```

### AI Service (Python)
```bash
cd ai_service
pip install -r requirements.txt    # Install dependencies
python main.py                     # Start FastAPI server
```

---

## 🐳 Docker Commands

```bash
# Build specific service
docker-compose build backend
docker-compose build frontend
docker-compose build ai_service

# View logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs ai_service

# Stop services
docker-compose down

# Remove volumes (reset data)
docker-compose down -v

# Rebuild and restart
docker-compose up --build
```

---

## 🏥 Health Monitoring

### Service Status Monitoring

The frontend provides a real-time dashboard showing:
- ✅ **Service Connectivity Status**
- 📊 **Health Check Responses**
- 🔄 **Manual Connection Testing**
- 📈 **Service Information**

### Health Check Endpoints

Each service provides detailed health information:

**Backend Health Check:**
```json
{
  "status": "ok",
  "service": "backend",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "development",
  "database": "connected",
  "port": 5000
}
```

**AI Service Health Check:**
```json
{
  "status": "ok",
  "service": "ai_service",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0",
  "environment": "development",
  "port": 8000,
  "features": {
    "face_detection": "pending_phase_4",
    "face_recognition": "pending_phase_4",
    "liveness_detection": "pending_phase_4"
  }
}
```

---

## 🛠️ Troubleshooting

### Common Issues

**🔴 Backend Connection Error**
```bash
# Check MongoDB connection string in .env
# Verify MongoDB Atlas network access
# Check backend logs: docker-compose logs backend
```

**🔴 Frontend Build Error**
```bash
# Clear node_modules and reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**🔴 AI Service Import Error**
```bash
# Rebuild AI service container
docker-compose build ai_service
```

**🔴 Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000
netstat -tulpn | grep :8000

# Kill process or change port in .env
```

### Service-Specific Debugging

**Backend Debugging:**
```bash
# Enter backend container
docker-compose exec backend bash

# Check environment variables
printenv | grep MONGO

# Test MongoDB connection
node -e "console.log(process.env.MONGO_URI)"
```

**Frontend Debugging:**
```bash
# Check build output
docker-compose logs frontend

# Access container
docker-compose exec frontend sh

# Verify Vite configuration
cat vite.config.js
```

**AI Service Debugging:**
```bash
# Check Python packages
docker-compose exec ai_service pip list

# View FastAPI logs
docker-compose logs ai_service

# Test endpoint manually
curl http://localhost:8000/ping
```

---

## 🚀 Next Phase Preview

### Phase 2: Authentication & Authorization
- 🔐 JWT authentication system
- 👥 User registration & login
- 🎭 Role-based access (Teacher/Student)
- 🛡️ Protected routes & middleware

### Phase 3: Core Business Logic
- 🏫 Class management system
- 👨‍🎓 Student enrollment
- 📅 Session creation & management
- 📊 Basic dashboard interfaces

### Phase 4: AI Integration
- 🤖 Face detection (MTCNN)
- 🧠 Face recognition (FaceNet)
- 🔍 Similarity search (Faiss)
- 📸 Automated attendance marking

---

## 📋 Phase 1 Checklist

- [x] **Infrastructure Setup**
  - [x] Docker & Docker Compose configuration
  - [x] Multi-service architecture
  - [x] Network configuration
  - [x] Volume management

- [x] **Backend Service**
  - [x] Node.js + Express setup
  - [x] MongoDB Atlas connection
  - [x] Health check endpoint
  - [x] CORS & security middleware
  - [x] Error handling

- [x] **Frontend Service**
  - [x] React 18 + Vite setup
  - [x] Tailwind CSS configuration
  - [x] Service status dashboard
  - [x] API integration
  - [x] Responsive design

- [x] **AI Service**
  - [x] Python + FastAPI setup
  - [x] Health check endpoint
  - [x] CORS configuration
  - [x] Future endpoint placeholders
  - [x] Documentation generation

- [x] **Documentation & Setup**
  - [x] Comprehensive README
  - [x] Environment configuration
  - [x] Docker setup guide
  - [x] Troubleshooting guide

---

## 👥 Team & Contributions

**Phase 1 Contributors:**
- Infrastructure & Backend Setup
- Frontend Development
- AI Service Foundation
- Documentation & Testing

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---
