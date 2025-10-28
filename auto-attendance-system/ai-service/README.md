# Auto Attendance System - AI Service

## Overview
FastAPI-based microservice for face recognition and automatic attendance marking.

## Features
- Face detection and recognition using face_recognition library
- REST API endpoints for image analysis
- Face embedding extraction and comparison
- CORS support for frontend integration

## Installation

### Prerequisites
- Python 3.8+
- pip package manager

### Setup
```bash
# Navigate to ai-service directory
cd ai-service

# Install dependencies
pip install -r requirements.txt

# Run the service
python main.py
```

## API Endpoints

### Health Check
- **GET** `/` - Service status
- **GET** `/health` - Detailed health check

### Face Analysis
- **POST** `/analyze` - Analyze uploaded photo for faces
  - Input: Multipart form data with image file
  - Output: Face detection results with embeddings

- **POST** `/compare` - Compare faces against reference embeddings
  - Input: Image file + reference embeddings
  - Output: Face matching results

## Sample Response Format
```json
{
  "facesDetected": 3,
  "embeddings": [
    [0.1, -0.2, 0.5],
    [0.3, 0.1, -0.4], 
    [-0.1, 0.6, 0.2]
  ],
  "faceLocations": [
    {"top": 50, "right": 150, "bottom": 200, "left": 100}
  ],
  "message": "Successfully detected 3 face(s)",
  "filename": "class_photo.jpg",
  "fileSize": 245760,
  "contentType": "image/jpeg",
  "timestamp": "2025-10-12T12:00:00Z"
}
```

## Configuration
Environment variables in `.env`:
- `AI_SERVICE_PORT`: Service port (default: 8000)
- `FACE_RECOGNITION_TOLERANCE`: Face matching threshold
- `MAX_IMAGE_SIZE`: Maximum upload size

## Development
```bash
# Run with auto-reload
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```