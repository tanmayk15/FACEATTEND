"""
FastAPI AI Service for Face Recognition
Auto Attendance System - AI Microservice
"""

import os
import io
import logging
import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
from pydantic import BaseModel
import cv2
from deepface import DeepFace
from sklearn.metrics.pairwise import cosine_similarity
from mtcnn import MTCNN

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Pydantic models for request/response
class FaceComparisonRequest(BaseModel):
    referenceEmbeddings: List[List[float]]
    studentIds: List[str]
    threshold: Optional[float] = 0.6

class StudentMatch(BaseModel):
    studentId: str
    faceIndex: int
    confidence: float
    similarity: float
    matched: bool

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
    Process uploaded image to detect faces using MTCNN and extract embeddings with DeepFace
    
    Args:
        image_data: Raw image bytes
        
    Returns:
        Dictionary with face detection results including real embeddings
    """
    try:
        # Convert bytes to PIL Image
        pil_image = Image.open(io.BytesIO(image_data))
        
        # Convert PIL to RGB numpy array
        rgb_image = np.array(pil_image.convert('RGB'))
        
        # Detect faces using MTCNN (more accurate than Haar Cascade)
        detector = MTCNN()
        detections = detector.detect_faces(rgb_image)
        
        if len(detections) == 0:
            logger.warning("No faces detected in the image")
            return {
                "facesDetected": 0,
                "embeddings": [],
                "faceLocations": [],
                "message": "No faces detected in the image. Please ensure faces are clearly visible."
            }
        
        # Extract face embeddings and locations
        embeddings_list = []
        locations_list = []
        
        for detection in detections:
            try:
                # Get bounding box
                x, y, width, height = detection['box']
                
                # Ensure positive coordinates and within image bounds
                x = max(0, x)
                y = max(0, y)
                x2 = min(rgb_image.shape[1], x + width)
                y2 = min(rgb_image.shape[0], y + height)
                
                # Extract face region
                face_img = rgb_image[y:y2, x:x2]
                
                # Skip if face region is too small
                if face_img.shape[0] < 10 or face_img.shape[1] < 10:
                    logger.warning(f"Skipping very small face region: {face_img.shape}")
                    continue
                
                # Extract embedding using DeepFace (VGG-Face model produces 2622-d vector)
                # We'll use Facenet model which produces 128-d vector (compatible with our schema)
                embedding_objs = DeepFace.represent(
                    face_img,
                    model_name='Facenet',
                    enforce_detection=False,  # Already detected with MTCNN
                    detector_backend='skip'    # Skip detection, use the cropped face
                )
                
                # DeepFace.represent returns a list of dictionaries
                if embedding_objs and len(embedding_objs) > 0:
                    embedding = embedding_objs[0]['embedding']
                    embeddings_list.append(embedding)
                    
                    # Format location data (top, right, bottom, left)
                    locations_list.append({
                        "top": int(y),
                        "right": int(x2),
                        "bottom": int(y2),
                        "left": int(x)
                    })
                    
            except Exception as e:
                logger.warning(f"Error processing face: {str(e)}")
                continue
        
        if len(embeddings_list) == 0:
            logger.warning("No valid face embeddings could be extracted")
            return {
                "facesDetected": 0,
                "embeddings": [],
                "faceLocations": [],
                "message": "Faces detected but could not extract embeddings. Please ensure faces are clear and well-lit."
            }
        
        logger.info(f"Successfully processed image: {len(embeddings_list)} faces detected with real embeddings")
        
        return {
            "facesDetected": len(embeddings_list),
            "embeddings": embeddings_list,
            "faceLocations": locations_list,
            "message": f"Successfully detected {len(embeddings_list)} face(s) with encodings"
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
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "service": "ai-face-recognition",
            "version": "1.0.0"
        })
        
        return JSONResponse(content=result, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in analyze endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.post("/detect-faces")
async def detect_faces(file: UploadFile = File(...)):
    """
    Detect faces in uploaded photo (alias for /analyze for compatibility)
    
    Args:
        file: Uploaded image file (multipart/form-data)
        
    Returns:
        JSON response with face detection results
    """
    return await analyze_faces(file)

@app.post("/compare")
async def compare_faces(
    file: UploadFile = File(...),
    request_data: str = Body(...)
):
    """
    Compare faces in uploaded image against reference embeddings
    
    Args:
        file: Uploaded image file (class photo)
        request_data: JSON string containing referenceEmbeddings, studentIds, threshold
        
    Returns:
        JSON response with matched students and confidence scores
    """
    try:
        import json
        
        # Parse request data
        data = json.loads(request_data)
        reference_embeddings = data.get('referenceEmbeddings', [])
        student_ids = data.get('studentIds', [])
        threshold = data.get('threshold', 0.6)
        
        if not reference_embeddings or not student_ids:
            raise HTTPException(
                status_code=400,
                detail="Both referenceEmbeddings and studentIds are required"
            )
        
        if len(reference_embeddings) != len(student_ids):
            raise HTTPException(
                status_code=400,
                detail="Number of embeddings must match number of student IDs"
            )
        
        # Process uploaded image
        image_data = await file.read()
        result = process_image_for_faces(image_data)
        
        if result["facesDetected"] == 0:
            return JSONResponse(content={
                **result,
                "matches": [],
                "totalMatches": 0,
                "unmatchedFaces": 0
            }, status_code=200)
        
        # Get detected face embeddings
        detected_embeddings = result["embeddings"]
        
        # Convert to numpy arrays for comparison
        detected_array = np.array(detected_embeddings)
        reference_array = np.array(reference_embeddings)
        
        # Calculate cosine similarity between all detected faces and all reference faces
        # Shape: (num_detected_faces, num_reference_faces)
        similarities = cosine_similarity(detected_array, reference_array)
        
        # Find best matches for each detected face
        matches = []
        matched_students = set()
        
        for face_idx, face_similarities in enumerate(similarities):
            # Find the best matching student for this face
            best_match_idx = np.argmax(face_similarities)
            best_similarity = face_similarities[best_match_idx]
            
            # Check if similarity meets threshold
            if best_similarity >= threshold:
                student_id = student_ids[best_match_idx]
                
                # Avoid duplicate matches (one student can only be matched once)
                if student_id not in matched_students:
                    matched_students.add(student_id)
                    
                    matches.append({
                        "studentId": student_id,
                        "faceIndex": face_idx,
                        "confidence": float(best_similarity),
                        "similarity": float(best_similarity),
                        "matched": True,
                        "faceLocation": result["faceLocations"][face_idx],
                        "threshold": threshold
                    })
                    
                    logger.info(f"Matched student {student_id} with confidence {best_similarity:.3f}")
        
        # Calculate statistics
        total_detected = result["facesDetected"]
        total_matched = len(matches)
        unmatched_faces = total_detected - total_matched
        
        logger.info(f"Comparison complete: {total_matched}/{total_detected} faces matched")
        
        result.update({
            "matches": matches,
            "totalMatches": total_matched,
            "unmatchedFaces": unmatched_faces,
            "totalDetected": total_detected,
            "threshold": threshold,
            "comparisonTimestamp": datetime.utcnow().isoformat() + "Z"
        })
        
        return JSONResponse(content=result, status_code=200)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        raise HTTPException(status_code=400, detail="Invalid JSON in request data")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in compare endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/enroll-student")
async def enroll_student_face(file: UploadFile = File(...)):
    """
    Process and enroll a student's face during registration
    
    Args:
        file: Uploaded face photo
        
    Returns:
        Face embedding and metadata for storage
    """
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="File must be an image (JPEG, PNG, etc.)"
            )
        
        # Read and process image
        image_data = await file.read()
        result = process_image_for_faces(image_data)
        
        # Validate exactly one face detected
        if result["facesDetected"] == 0:
            raise HTTPException(
                status_code=400,
                detail="No face detected. Please upload a clear photo with your face visible."
            )
        
        if result["facesDetected"] > 1:
            raise HTTPException(
                status_code=400,
                detail=f"Multiple faces detected ({result['facesDetected']}). Please upload a photo with only your face."
            )
        
        # Return the single face embedding
        return JSONResponse(content={
            "success": True,
            "faceEmbedding": result["embeddings"][0],
            "faceLocation": result["faceLocations"][0],
            "message": "Face successfully enrolled",
            "quality": "good"  # In future, add quality checks
        }, status_code=200)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in enroll-student endpoint: {str(e)}")
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
        app,  # Pass app directly instead of string to avoid Windows multiprocessing issues
        host="0.0.0.0", 
        port=8000, 
        reload=False,  # Disable reload on Windows to avoid multiprocessing errors
        log_level="info"
    )