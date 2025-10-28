from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Auto Attendance AI Service",
    description="AI microservice for face recognition and attendance automation - Phase 4",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5001",
        "http://localhost:5000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/ping")
async def health_check():
    """Health check endpoint"""
    return JSONResponse(content={
        "status": "ok",
        "service": "ai_service",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "4.0.0",
        "phase": "Phase 4 - AI Face Recognition",
        "message": "AI Service is running but AI models are being configured"
    })

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🤖 Auto Attendance AI Service - Phase 4",
        "status": "running",
        "phase": "4 - AI Face Recognition & Automation",
        "note": "AI models are being configured for compatibility",
        "endpoints": {
            "health": "/health",
            "docs": "/docs"
        }
    }

if __name__ == "__main__":
    uvicorn.run(
        "main_simple:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )