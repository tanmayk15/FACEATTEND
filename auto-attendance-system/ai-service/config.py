"""
Configuration module for AI Service
"""

import os
from typing import List

class Settings:
    """Application settings"""
    
    # Service Configuration
    HOST: str = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
    PORT: int = int(os.getenv("AI_SERVICE_PORT", "8000"))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "info")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")
    
    # Face Recognition Settings
    FACE_RECOGNITION_TOLERANCE: float = float(os.getenv("FACE_RECOGNITION_TOLERANCE", "0.6"))
    FACE_DETECTION_MODEL: str = os.getenv("FACE_DETECTION_MODEL", "hog")
    FACE_ENCODING_MODEL: str = os.getenv("FACE_ENCODING_MODEL", "large")
    
    # Image Processing Settings
    MAX_IMAGE_SIZE: int = int(os.getenv("MAX_IMAGE_SIZE", "10485760"))  # 10MB
    ALLOWED_EXTENSIONS: List[str] = os.getenv(
        "ALLOWED_EXTENSIONS", 
        "jpg,jpeg,png,bmp"
    ).split(",")
    RESIZE_IMAGES: bool = os.getenv("RESIZE_IMAGES", "true").lower() == "true"
    MAX_RESIZE_WIDTH: int = int(os.getenv("MAX_RESIZE_WIDTH", "1920"))
    MAX_RESIZE_HEIGHT: int = int(os.getenv("MAX_RESIZE_HEIGHT", "1080"))
    
    # Performance Settings
    NUM_JITTERS: int = int(os.getenv("NUM_JITTERS", "1"))
    FACE_LOCATIONS_MODEL: str = os.getenv("FACE_LOCATIONS_MODEL", "hog")

settings = Settings()