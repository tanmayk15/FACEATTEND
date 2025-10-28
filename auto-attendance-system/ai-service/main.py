"""
FastAPI AI Service for Face Recognition
Auto Attendance System - AI Microservice
"""

import os
import io
import logging
import numpy as np
from typing import List, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import cv2

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Auto Attendance AI Service",
    description="Face Recognition Microservice for Automatic Attendance",
    version="1.0.0"
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Auto Attendance AI Service",
        "status": "running",
        "version": "1.0.0",
        "endpoints": {
            "analyze": "/analyze",
            "health": "/health"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": "ai-face-recognition",
        "dependencies": {
            "face_recognition": "available",
            "opencv": "available",
            "pillow": "available"
        }
    }

def process_image_for_faces(image_data: bytes) -> Dict[str, Any]:
    """
    Process uploaded image to detect faces using OpenCV
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary with face detection results
    """
    try:
        # Convert bytes to PIL Image
        image = Image.open(io.BytesIO(image_data))
        
        # Convert PIL to OpenCV format
        opencv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        gray = cv2.cvtColor(opencv_image, cv2.COLOR_BGR2GRAY)
        
        # Load OpenCV face classifier
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4)
        
        if len(faces) == 0:
            return {
                "facesDetected": 0,
                "embeddings": [],
                "faceLocations": [],
                "message": "No faces detected in the image"
            }
        
        # Create mock embeddings (128-dimensional vectors)
        embeddings_list = []
        locations_list = []
        
        for i, (x, y, w, h) in enumerate(faces):
            # Create a mock embedding (in real implementation, use a deep learning model)
            mock_embedding = np.random.rand(128).tolist()
            embeddings_list.append(mock_embedding)
            
            # Convert OpenCV rectangle to face_recognition format
            locations_list.append({
                "top": int(y),
                "right": int(x + w),
                "bottom": int(y + h),
                "left": int(x)
            })
        
        logger.info(f"Successfully processed image: {len(faces)} faces detected")
        
        return {
            "facesDetected": len(faces),
            "embeddings": embeddings_list,
            "faceLocations": locations_list,
            "message": f"Successfully detected {len(faces)} face(s)"
        }
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

@app.post("/analyze")
async def analyze_faces(file: UploadFile = File(...)):
    """
    Analyze uploaded photo for face detection and embedding extraction
    
    Args:
        file: Uploaded image file (multipart/form-data)
        
    Returns:
        JSON response with face analysis results
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="File must be an image (JPEG, PNG, etc.)"
            )
        
        # Read file content
        image_data = await file.read()
        
        if len(image_data) == 0:
            raise HTTPException(status_code=400, detail="Empty file uploaded")
        
        # Process image for face detection
        result = process_image_for_faces(image_data)
        
        # Add metadata
        result.update({
            "filename": file.filename,
            "fileSize": len(image_data),
            "contentType": file.content_type,
            "timestamp": "2025-10-12T12:00:00Z",  # You can use datetime.utcnow()
            "service": "ai-face-recognition",
            "version": "1.0.0"
        })
        
        return JSONResponse(content=result, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/compare")
async def compare_faces(file: UploadFile = File(...), reference_embeddings: List[List[float]] = None):
    """
    Compare faces in uploaded image against reference embeddings
    
    Args:
        file: Uploaded image file
        reference_embeddings: List of reference face embeddings for comparison
        
    Returns:
        JSON response with comparison results
    """
    try:
        # This endpoint will be used for actual attendance marking
        # For now, return a mock response
        image_data = await file.read()
        result = process_image_for_faces(image_data)
        
        # Mock comparison results
        if result["facesDetected"] > 0 and reference_embeddings:
            # In real implementation, calculate cosine similarity
            matches = [
                {
                    "faceIndex": i,
                    "matchFound": True,
                    "confidence": 0.85 + (i * 0.05),  # Mock confidence scores
                    "studentId": f"student_{i+1}",
                    "threshold": 0.8
                } for i in range(min(result["facesDetected"], len(reference_embeddings)))
            ]
        else:
            matches = []
        
        result.update({
            "matches": matches,
            "totalMatches": len(matches),
            "comparisonTimestamp": "2025-10-12T12:00:00Z"
        })
        
        return JSONResponse(content=result, status_code=200)
        
    except Exception as e:
        logger.error(f"Error in compare endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Sample response format for documentation
SAMPLE_RESPONSE = {
    "facesDetected": 3,
    "embeddings": [
        [0.1, -0.2, 0.5],  # 128-dimensional embedding (truncated for example)
        [0.3, 0.1, -0.4],
        [-0.1, 0.6, 0.2]
    ],
    "faceLocations": [
        {"top": 50, "right": 150, "bottom": 200, "left": 100},
        {"top": 60, "right": 300, "bottom": 210, "left": 250},
        {"top": 80, "right": 450, "bottom": 230, "left": 400}
    ],
    "message": "Successfully detected 3 face(s)",
    "filename": "class_photo.jpg",
    "fileSize": 245760,
    "contentType": "image/jpeg",
    "timestamp": "2025-10-12T12:00:00Z",
    "service": "ai-face-recognition",
    "version": "1.0.0"
}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )