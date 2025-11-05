from fastapi import FastAPI, File, UploadFile, HTTPException, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import os
import io
import json
import aiofiles
import numpy as np
from datetime import datetime
from typing import List, Optional, Dict, Any
import logging
from pathlib import Path

# Import custom modules
from app.models.face_recognizer import FaceRecognizer
from app.utils.image_processing import ImageProcessor
from app.utils.similarity import FaceMatchingConfig
from app.utils.backend_integration import get_backend_integration, cleanup_backend_integration

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Auto Attendance AI Service",
    description="AI microservice for face recognition and attendance automation - Phase 4",
    version="4.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - allow frontend and backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://frontend:3000",   # Docker frontend
        "http://localhost:5001",  # Backend
        "http://backend:5001",    # Docker backend
        "http://localhost:5000",  # Alternative backend port
        "http://backend:5000",    # Docker backend alternative
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Mount static files for uploaded images
app.mount("/static", StaticFiles(directory="static"), name="static")

# Global face recognizer instance
face_recognizer: Optional[FaceRecognizer] = None

@app.on_event("startup")
async def startup_event():
    """Initialize AI models on startup"""
    global face_recognizer
    try:
        logger.info("🚀 Initializing AI Service for Phase 4...")
        
        # Initialize face recognizer
        face_recognizer = FaceRecognizer()
        
        # Create upload directories if they don't exist
        os.makedirs("static/uploads", exist_ok=True)
        os.makedirs("static/enrollments", exist_ok=True)
        
        # Test backend connectivity
        backend = get_backend_integration()
        backend_healthy = await backend.health_check()
        if backend_healthy:
            logger.info("✅ Backend connectivity verified")
        else:
            logger.warning("⚠️ Backend not reachable - operating in standalone mode")
        
        logger.info("✅ AI Service initialized successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to initialize AI Service: {e}")
        # Continue running but mark as not ready
        face_recognizer = None

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup resources on shutdown"""
    try:
        logger.info("🛑 Shutting down AI Service...")
        await cleanup_backend_integration()
        logger.info("✅ AI Service shutdown complete")
    except Exception as e:
        logger.error(f"❌ Error during shutdown: {e}")

def get_face_recognizer() -> FaceRecognizer:
    """Dependency to get face recognizer instance"""
    if face_recognizer is None:
        raise HTTPException(
            status_code=503, 
            detail="AI Service not ready. Face recognition models not loaded."
        )
    return face_recognizer

# Health check endpoint
@app.get("/health")
@app.get("/ping")  # Backward compatibility
async def health_check():
    """Comprehensive health check endpoint"""
    try:
        health_status = {
            "status": "ok" if face_recognizer is not None else "initializing",
            "service": "ai_service",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "4.0.0",
            "phase": "Phase 4 - AI Face Recognition",
            "environment": os.getenv("ENVIRONMENT", "development"),
            "port": int(os.getenv("AI_SERVICE_PORT", 8000)),
            "features": {
                "face_detection": "enabled" if face_recognizer else "loading",
                "face_recognition": "enabled" if face_recognizer else "loading",
                "embedding_extraction": "enabled" if face_recognizer else "loading",
                "similarity_matching": "enabled" if face_recognizer else "loading"
            },
            "models": {
                "mtcnn": "loaded" if face_recognizer else "loading",
                "facenet": "loaded" if face_recognizer else "loading",
                "faiss_index": "ready" if face_recognizer else "not_ready"
            }
        }
        
        if face_recognizer:
            db_info = face_recognizer.get_database_info()
            health_status["database"] = db_info
        
        logger.info("🏥 AI Service health check completed")
        return JSONResponse(content=health_status)
        
    except Exception as e:
        logger.error(f"❌ Health check failed: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": str(e),
                "service": "ai_service"
            }
        )

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "message": "🤖 Auto Attendance AI Service - Phase 4",
        "status": "running",
        "phase": "4 - AI Face Recognition & Automation",
        "capabilities": [
            "Face Detection (MTCNN)",
            "Face Recognition (FaceNet)",
            "Student Enrollment",
            "Classroom Analysis",
            "Attendance Automation"
        ],
        "endpoints": {
            "health": "/health",
            "docs": "/docs",
            "analyze": "/analyze",
            "enroll": "/enroll-student",
            "database": "/database/info"
        }
    }

@app.post("/detect-faces")
async def detect_faces_simple(
    file: UploadFile = File(...),
    recognizer: FaceRecognizer = Depends(get_face_recognizer)
):
    """
    Simple face detection endpoint - just detect faces without recognition
    
    This endpoint:
    1. Receives an image file
    2. Detects all faces using MTCNN
    3. Extracts embeddings for each face
    4. Returns detection results (no student matching)
    
    Used for initial photo upload and face counting
    """
    try:
        logger.info(f"📸 Detecting faces in uploaded image")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Load image using our processor
        image = ImageProcessor.load_image_from_bytes(image_data)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Validate image
        if not ImageProcessor.validate_image(image):
            raise HTTPException(status_code=400, detail="Image does not meet requirements")
        
        # Detect faces
        detected_faces = recognizer.detect_faces(image)
        
        # Extract embeddings for all detected faces
        embeddings = []
        face_locations = []
        
        for face in detected_faces:
            bbox = face['bbox']
            embedding = recognizer.extract_embedding(image, bbox)
            
            if embedding is not None:
                embeddings.append(embedding.tolist())
                face_locations.append({
                    'top': int(bbox[1]),
                    'right': int(bbox[2]),
                    'bottom': int(bbox[3]),
                    'left': int(bbox[0])
                })
        
        # Prepare response
        response = {
            "faces_detected": len(detected_faces),
            "facesDetected": len(detected_faces),  # Backward compatibility
            "embeddings": embeddings,
            "face_locations": face_locations,
            "faceLocations": face_locations,  # Backward compatibility
            "message": f"Successfully detected {len(detected_faces)} face(s)",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "version": "4.0.0"
        }
        
        logger.info(f"✅ Face detection complete: {len(detected_faces)} faces detected")
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error detecting faces: {e}")
        raise HTTPException(status_code=500, detail=f"Face detection failed: {str(e)}")

@app.post("/analyze")
async def analyze_classroom_image(
    file: UploadFile = File(...),
    class_id: str = Form(...),
    session_id: str = Form(...),
    threshold: float = Form(0.7),
    recognizer: FaceRecognizer = Depends(get_face_recognizer)
):
    """
    Analyze classroom image and recognize students
    
    This is the main endpoint for attendance automation:
    1. Receives classroom photo from backend
    2. Detects all faces using MTCNN
    3. Extracts embeddings using FaceNet
    4. Matches against enrolled students
    5. Returns recognition results with confidence scores
    """
    try:
        logger.info(f"📸 Analyzing classroom image for class {class_id}, session {session_id}")
        
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read image data
        image_data = await file.read()
        
        # Load image using our processor
        image = ImageProcessor.load_image_from_bytes(image_data)
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Validate image
        if not ImageProcessor.validate_image(image):
            raise HTTPException(status_code=400, detail="Image does not meet requirements")
        
        # TODO: Load student database for this class from backend
        # For now, we'll use the current in-memory database
        # In production, this should fetch from backend API:
        backend = get_backend_integration()
        
        # Try to load students from backend
        try:
            class_students = await backend.fetch_class_students(class_id)
            if class_students:
                logger.info(f"📚 Loaded {len(class_students)} students from backend for class {class_id}")
                # TODO: Convert student data to face embeddings if needed
                # This would require fetching student face images and processing them
            else:
                logger.warning(f"⚠️ No students found in backend for class {class_id}, using local database")
        except Exception as e:
            logger.warning(f"⚠️ Failed to load students from backend: {e}, using local database")
        
        # Analyze the classroom image
        analysis_results = recognizer.analyze_classroom_image(image, threshold)
        
        # Save analyzed image for debugging/audit trail
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"analysis_{class_id}_{session_id}_{timestamp}.jpg"
        
        # Annotate image with results
        annotated_image = ImageProcessor.annotate_image(
            image, 
            analysis_results['recognized_faces'],
            show_confidence=True
        )
        
        # Save to static directory
        image_bytes = ImageProcessor.save_image_to_bytes(annotated_image)
        if image_bytes:
            async with aiofiles.open(f"static/uploads/{filename}", "wb") as f:
                await f.write(image_bytes)
        
        # Prepare response
        response = {
            "analysis_id": f"{session_id}_{timestamp}",
            "class_id": class_id,
            "session_id": session_id,
            "recognized_faces": analysis_results['recognized_faces'],
            "unknown_faces": analysis_results['unknown_faces'],
            "total_detected": analysis_results['total_detected'],
            "processing_info": analysis_results.get('processing_info', {}),
            "annotated_image_url": f"/static/uploads/{filename}",
            "threshold_used": threshold,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Update attendance records in backend if we have recognized faces
        if analysis_results['recognized_faces']:
            try:
                # Prepare attendance data
                attendance_data = []
                for face in analysis_results['recognized_faces']:
                    attendance_data.append({
                        "student_id": face['student_id'],
                        "status": "present",
                        "confidence": face['confidence'],
                        "detection_method": "ai_face_recognition",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                
                # Update backend
                backend = get_backend_integration()
                update_success = await backend.update_attendance_records(session_id, attendance_data)
                
                if update_success:
                    response["attendance_updated"] = True
                    response["updated_students"] = len(attendance_data)
                    logger.info(f"✅ Updated attendance for {len(attendance_data)} students")
                else:
                    response["attendance_updated"] = False
                    logger.warning("⚠️ Failed to update attendance records in backend")
                    
                # Notify backend of recognition completion
                await backend.notify_recognition_complete(session_id, {
                    "total_detected": analysis_results['total_detected'],
                    "recognized_count": len(analysis_results['recognized_faces']),
                    "unknown_count": analysis_results['unknown_faces'],
                    "threshold_used": threshold
                })
                
            except Exception as e:
                logger.error(f"❌ Error updating attendance: {e}")
                response["attendance_updated"] = False
                response["attendance_error"] = str(e)
        
        logger.info(f"✅ Analysis complete: {len(analysis_results['recognized_faces'])} recognized, "
                   f"{analysis_results['unknown_faces']} unknown")
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error analyzing classroom image: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.post("/enroll-student")
async def enroll_student(
    file: UploadFile = File(...),
    student_id: str = Form(...),
    student_name: str = Form(...),
    recognizer: FaceRecognizer = Depends(get_face_recognizer)
):
    """
    Enroll a student by processing their face image and storing embedding
    
    This endpoint:
    1. Receives student photo from backend
    2. Detects face in the image
    3. Extracts face embedding
    4. Stores in recognition database
    """
    try:
        logger.info(f"👤 Enrolling student: {student_name} (ID: {student_id})")
        
        # Validate file
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = ImageProcessor.load_image_from_bytes(image_data)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Enhance image quality for better recognition
        enhanced_image = ImageProcessor.enhance_image_quality(image)
        
        # Detect faces
        detected_faces = recognizer.detect_faces(enhanced_image)
        
        if len(detected_faces) == 0:
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        if len(detected_faces) > 1:
            raise HTTPException(status_code=400, detail="Multiple faces detected. Please use image with single face")
        
        # Extract embedding from the detected face
        face_data = detected_faces[0]
        bbox = face_data['bbox']
        
        embedding = recognizer.extract_embedding(enhanced_image, bbox)
        
        if embedding is None:
            raise HTTPException(status_code=400, detail="Failed to extract face embedding")
        
        # Add student to database
        success = recognizer.add_student_to_database(student_id, student_name, embedding)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to add student to database")
        
        # Save enrollment image for records
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"enrollment_{student_id}_{timestamp}.jpg"
        
        # Annotate the image with detection box
        annotated = ImageProcessor.annotate_image(enhanced_image, detected_faces, show_confidence=True)
        image_bytes = ImageProcessor.save_image_to_bytes(annotated)
        
        if image_bytes:
            async with aiofiles.open(f"static/enrollments/{filename}", "wb") as f:
                await f.write(image_bytes)
        
        response = {
            "student_id": student_id,
            "student_name": student_name,
            "enrollment_status": "success",
            "face_detected": True,
            "embedding_extracted": True,
            "detection_confidence": face_data['confidence'],
            "enrollment_image_url": f"/static/enrollments/{filename}",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        logger.info(f"✅ Student enrolled successfully: {student_name}")
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error enrolling student: {e}")
        raise HTTPException(status_code=500, detail=f"Enrollment failed: {str(e)}")

@app.post("/compare")
async def compare_faces(
    file: UploadFile = File(...),
    request_data: str = Form(...),
    recognizer: FaceRecognizer = Depends(get_face_recognizer)
):
    """
    Compare detected faces in classroom photo with reference embeddings
    
    This is the main attendance recognition endpoint:
    1. Receives classroom photo
    2. Receives reference embeddings and student IDs from backend
    3. Detects all faces in the photo
    4. Compares each detected face with reference embeddings
    5. Returns matches with confidence scores
    
    Args:
        file: Classroom photo
        request_data: JSON string containing referenceEmbeddings, studentIds, threshold
    """
    try:
        logger.info(f"🔍 Comparing faces in classroom photo with reference database")
        
        # Parse request data
        data = json.loads(request_data)
        reference_embeddings = data.get('referenceEmbeddings', [])
        student_ids = data.get('studentIds', [])
        threshold = data.get('threshold', 0.6)
        
        logger.info(f"📊 Reference data: {len(reference_embeddings)} students, threshold: {threshold}")
        
        if not reference_embeddings or not student_ids:
            raise HTTPException(status_code=400, detail="Missing reference embeddings or student IDs")
        
        if len(reference_embeddings) != len(student_ids):
            raise HTTPException(status_code=400, detail="Number of embeddings must match number of student IDs")
        
        # Validate file
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and process image
        image_data = await file.read()
        image = ImageProcessor.load_image_from_bytes(image_data)
        
        if image is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Detect faces in classroom photo
        detected_faces = recognizer.detect_faces(image)
        logger.info(f"👥 Detected {len(detected_faces)} faces in classroom photo")
        
        if len(detected_faces) == 0:
            return JSONResponse(content={
                "facesDetected": 0,
                "totalMatches": 0,
                "matches": [],
                "unmatchedFaces": 0,
                "message": "No faces detected in classroom photo",
                "timestamp": datetime.utcnow().isoformat() + "Z"
            })
        
        # Extract embeddings for detected faces
        detected_embeddings = []
        valid_face_indices = []
        
        for i, face in enumerate(detected_faces):
            bbox = face['bbox']
            embedding = recognizer.extract_embedding(image, bbox)
            
            if embedding is not None:
                detected_embeddings.append(embedding)
                valid_face_indices.append(i)
        
        logger.info(f"✅ Extracted {len(detected_embeddings)} valid embeddings from detected faces")
        
        # Convert reference embeddings to numpy arrays
        reference_embeddings_np = [np.array(emb, dtype=np.float32) for emb in reference_embeddings]
        
        # Check if we need to handle dimension mismatch
        detected_dim = detected_embeddings[0].shape[0] if len(detected_embeddings) > 0 else 512
        reference_dim = reference_embeddings_np[0].shape[0] if len(reference_embeddings_np) > 0 else 128
        
        logger.info(f"🔍 Detected embedding dimension: {detected_dim}, Reference dimension: {reference_dim}")
        
        # If dimensions don't match, warn and skip comparison
        if detected_dim != reference_dim:
            logger.error(f"❌ Dimension mismatch: Cannot compare {detected_dim}D with {reference_dim}D embeddings")
            return JSONResponse(
                status_code=400,
                content={
                    "error": "dimension_mismatch",
                    "message": f"Detected embeddings are {detected_dim}-dimensional but stored embeddings are {reference_dim}-dimensional. Students need to re-register their faces.",
                    "facesDetected": len(detected_faces),
                    "totalMatches": 0,
                    "matches": [],
                    "unmatchedFaces": len(detected_embeddings),
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
            )
        
        # Compare each detected face with all reference faces
        matches = []
        matched_student_ids = set()
        
        for det_idx, detected_emb in enumerate(detected_embeddings):
            best_match_idx = -1
            best_similarity = -1.0
            
            # Compare with all reference embeddings
            for ref_idx, reference_emb in enumerate(reference_embeddings_np):
                # Calculate cosine similarity
                similarity = float(np.dot(detected_emb, reference_emb) / 
                                 (np.linalg.norm(detected_emb) * np.linalg.norm(reference_emb)))
                
                if similarity > best_similarity:
                    best_similarity = similarity
                    best_match_idx = ref_idx
            
            # If similarity is above threshold and student not already matched
            if best_similarity >= threshold and student_ids[best_match_idx] not in matched_student_ids:
                matches.append({
                    "studentId": student_ids[best_match_idx],
                    "confidence": round(best_similarity, 4),
                    "faceIndex": valid_face_indices[det_idx],
                    "bbox": detected_faces[valid_face_indices[det_idx]]['bbox']
                })
                matched_student_ids.add(student_ids[best_match_idx])
                logger.info(f"   ✅ Match found: Student {student_ids[best_match_idx]} with confidence {best_similarity:.4f}")
        
        # Calculate unmatched faces
        unmatched_faces = len(detected_embeddings) - len(matches)
        
        response = {
            "facesDetected": len(detected_faces),
            "validEmbeddings": len(detected_embeddings),
            "totalMatches": len(matches),
            "matches": matches,
            "unmatchedFaces": unmatched_faces,
            "threshold": threshold,
            "message": f"Successfully matched {len(matches)} out of {len(detected_embeddings)} detected faces",
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        logger.info(f"✅ Comparison complete: {len(matches)} matches, {unmatched_faces} unmatched")
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except json.JSONDecodeError as e:
        logger.error(f"❌ Invalid JSON in request_data: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON format in request_data")
    except Exception as e:
        logger.error(f"❌ Error comparing faces: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Face comparison failed: {str(e)}")

@app.get("/database/info")
async def get_database_info(recognizer: FaceRecognizer = Depends(get_face_recognizer)):
    """Get information about the current face recognition database"""
    try:
        db_info = recognizer.get_database_info()
        
        response = {
            "database_info": db_info,
            "timestamp": datetime.utcnow().isoformat(),
            "status": "active"
        }
        
        return JSONResponse(content=response)
        
    except Exception as e:
        logger.error(f"❌ Error getting database info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/database/clear")
async def clear_database(recognizer: FaceRecognizer = Depends(get_face_recognizer)):
    """Clear the face recognition database (for testing/reset)"""
    try:
        recognizer.face_database = {}
        recognizer._rebuild_index()
        
        logger.info("🗑️ Face recognition database cleared")
        
        return JSONResponse(content={
            "status": "success",
            "message": "Database cleared successfully",
            "timestamp": datetime.utcnow().isoformat()
        })
        
    except Exception as e:
        logger.error(f"❌ Error clearing database: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/models/status")
async def model_status():
    """Check the status of loaded AI models"""
    try:
        status = {
            "models": {
                "mtcnn": "loaded" if face_recognizer and face_recognizer.mtcnn else "not_loaded",
                "facenet": "loaded" if face_recognizer and face_recognizer.facenet else "not_loaded",
                "faiss_index": "ready" if face_recognizer and face_recognizer.embedding_index else "not_ready"
            },
            "device": face_recognizer.device if face_recognizer else "unknown",
            "ready": face_recognizer is not None,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        return JSONResponse(content=status)
        
    except Exception as e:
        logger.error(f"❌ Error checking model status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Global error handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ Unhandled AI Service Error: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal AI service error",
            "service": "ai_service",
            "phase": "4"
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("AI_SERVICE_PORT", 8000))
    
    print("🤖 ================================")
    print("🤖 AI Service Starting!")
    print(f"🤖 Port: {port}")
    print(f"🤖 Environment: {os.getenv('ENVIRONMENT', 'development')}")
    print(f"🤖 Health Check: http://localhost:{port}/ping")
    print(f"🤖 Documentation: http://localhost:{port}/docs")
    print("🤖 ================================")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )