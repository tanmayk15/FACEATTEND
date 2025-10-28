# Auto Attendance AI Service - Phase 4

## 🤖 AI Face Recognition & Attendance Automation

This is the **Phase 4** implementation of the Auto Attendance System's AI microservice. It provides advanced face recognition capabilities using state-of-the-art computer vision models for automated student attendance marking.

## 🎯 Features

### Core AI Capabilities
- **Face Detection**: MTCNN-based face detection with high accuracy
- **Face Recognition**: FaceNet embeddings for robust face matching
- **Similarity Search**: FAISS-powered vector similarity matching
- **Image Processing**: OpenCV-based image enhancement and annotation

### API Endpoints
- **`POST /analyze`**: Analyze classroom photos and recognize students
- **`POST /enroll-student`**: Enroll new students with face images
- **`GET /health`**: Service health check with model status
- **`GET /database/info`**: Face recognition database information
- **`GET /models/status`**: AI model loading status

### Integration Features
- **Backend Integration**: Seamless communication with Node.js backend
- **Attendance Updates**: Automatic attendance record updating
- **Image Storage**: Processed image storage with annotations
- **Error Handling**: Comprehensive error handling and logging

## 🏗️ Architecture

```
AI Service Architecture
├── main.py                     # FastAPI application entry point
├── app/
│   ├── models/
│   │   └── face_recognizer.py  # Core face recognition engine
│   └── utils/
│       ├── image_processing.py # Image handling utilities
│       ├── similarity.py       # Face matching algorithms
│       └── backend_integration.py # Backend communication
├── static/
│   ├── uploads/                # Analyzed classroom images
│   └── enrollments/            # Student enrollment images
├── requirements.txt            # Python dependencies
├── .env                       # Environment configuration
└── run_ai_service.py          # Service startup script
```

## 🚀 Quick Start

### Option 1: PowerShell (Recommended)
```powershell
# Navigate to AI service directory
cd "c:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\ai_service"

# Run setup script
.\start_ai_service.ps1
```

### Option 2: Command Prompt
```cmd
# Navigate to AI service directory
cd /d "c:\Users\ACER\Desktop\FaceAttend\auto-attendance-system\ai_service"

# Run setup script
start_ai_service.bat
```

### Option 3: Manual Setup
```bash
# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate    # Windows
source venv/bin/activate # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Start the service
python run_ai_service.py
```

## 📋 Requirements

### System Requirements
- **Python**: 3.8 or higher
- **Memory**: 4GB RAM minimum (8GB recommended)
- **Storage**: 2GB free space for models and dependencies
- **CPU**: Multi-core processor (GPU optional but recommended)

### Python Dependencies
- **FastAPI**: Web framework for API endpoints
- **PyTorch**: Deep learning framework for AI models
- **FaceNet-PyTorch**: Pre-trained face recognition models
- **OpenCV**: Computer vision and image processing
- **FAISS**: Vector similarity search engine
- **Scikit-learn**: Machine learning utilities

## 🔧 Configuration

### Environment Variables (.env)
```env
# Service Configuration
AI_SERVICE_HOST=0.0.0.0
AI_SERVICE_PORT=8000
ENVIRONMENT=development

# AI Model Configuration
FACE_DETECTION_THRESHOLD=0.7
FACE_RECOGNITION_THRESHOLD=0.7
MAX_FACE_SIZE=640
MIN_FACE_SIZE=40

# Backend Integration
BACKEND_API_URL=http://localhost:5001
BACKEND_API_TIMEOUT=30

# Performance Settings
WORKERS=1
DEVICE=auto  # auto, cpu, cuda
MEMORY_OPTIMIZATION=true
```

## 📊 API Usage

### 1. Health Check
```bash
curl http://localhost:8000/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "ai_service",
  "version": "4.0.0",
  "models": {
    "mtcnn": "loaded",
    "facenet": "loaded",
    "faiss_index": "ready"
  }
}
```

### 2. Enroll Student
```bash
curl -X POST "http://localhost:8000/enroll-student" \
  -F "file=@student_photo.jpg" \
  -F "student_id=STU001" \
  -F "student_name=John Doe"
```

**Response:**
```json
{
  "student_id": "STU001",
  "student_name": "John Doe",
  "enrollment_status": "success",
  "face_detected": true,
  "detection_confidence": 0.95
}
```

### 3. Analyze Classroom
```bash
curl -X POST "http://localhost:8000/analyze" \
  -F "file=@classroom_photo.jpg" \
  -F "class_id=CS101" \
  -F "session_id=SES001" \
  -F "threshold=0.7"
```

**Response:**
```json
{
  "analysis_id": "SES001_20241205_143022",
  "class_id": "CS101",
  "session_id": "SES001",
  "recognized_faces": [
    {
      "student_id": "STU001",
      "student_name": "John Doe",
      "confidence": 0.89,
      "bbox": [100, 150, 200, 250]
    }
  ],
  "unknown_faces": 2,
  "total_detected": 3,
  "attendance_updated": true
}
```

## 🔄 Integration with Backend

The AI service automatically integrates with the Node.js backend:

1. **Student Enrollment**: Fetches student data from backend API
2. **Attendance Updates**: Sends recognition results to update attendance
3. **Session Management**: Coordinates with backend for session tracking
4. **Error Reporting**: Reports processing errors back to backend

### Backend Communication Flow
```
Frontend -> Backend -> AI Service -> Backend -> Database
    │          │           │            │         │
    │          │           │            │         │
    ├─ Upload  ├─ Forward   ├─ Process   ├─ Update ├─ Store
    │  Image   │  Image     │  Faces     │  Records│  Results
```

## 🧪 Testing

### Run Test Suite
```bash
# Ensure AI service is running
python test_ai_service.py
```

### Manual Testing
1. **Start the service**: `python run_ai_service.py`
2. **Open browser**: Navigate to `http://localhost:8000/docs`
3. **Test endpoints**: Use the interactive API documentation
4. **Check logs**: Monitor console output for processing details

## 📈 Performance Optimization

### CPU Optimization
- **Model Loading**: Models are loaded once on startup
- **Batch Processing**: Multiple faces processed simultaneously
- **Memory Management**: Efficient tensor memory usage
- **Image Compression**: Automatic image size optimization

### GPU Acceleration (Optional)
```bash
# Install CUDA-enabled PyTorch (if GPU available)
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
```

## 🔐 Security Features

- **File Validation**: Strict image format validation
- **Size Limits**: Maximum file size enforcement
- **CORS Protection**: Configured cross-origin resource sharing
- **Input Sanitization**: Form data validation and sanitization

## 📝 Logging

The service provides comprehensive logging:

- **Startup Events**: Model loading and initialization
- **Processing Events**: Face detection and recognition
- **Integration Events**: Backend communication
- **Error Events**: Detailed error information and stack traces

Log files are saved to `ai_service.log` with rotation.

## 🐛 Troubleshooting

### Common Issues

**1. Models Not Loading**
```
Error: Failed to initialize AI Service
Solution: Check internet connection for model downloads
```

**2. Memory Issues**
```
Error: CUDA out of memory
Solution: Reduce batch size or use CPU mode
```

**3. Backend Connection Failed**
```
Error: Backend not reachable
Solution: Ensure backend is running on port 5001
```

**4. Face Detection Issues**
```
Error: No face detected in image
Solution: Ensure good lighting and face visibility
```

### Performance Tuning

- **CPU Usage**: Adjust `WORKERS` in environment
- **Memory Usage**: Enable `MEMORY_OPTIMIZATION`
- **Detection Accuracy**: Tune `FACE_DETECTION_THRESHOLD`
- **Recognition Accuracy**: Tune `FACE_RECOGNITION_THRESHOLD`

## 🔮 Future Enhancements

- **Liveness Detection**: Anti-spoofing measures
- **Emotion Recognition**: Student engagement analysis
- **Multi-Camera Support**: Multiple camera angles
- **Real-time Processing**: Live video stream analysis
- **Advanced Analytics**: Attendance pattern analysis

## 📞 Support

For technical support and questions:
- Check the API documentation at `/docs`
- Review logs in `ai_service.log`
- Test endpoints using the provided test suite
- Verify backend integration connectivity

---

**Phase 4** - AI Face Recognition & Attendance Automation ✨