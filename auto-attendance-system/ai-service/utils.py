"""
Utility functions for face recognition and image processing
"""

import numpy as np
from typing import List, Tuple, Dict, Any
import face_recognition
from PIL import Image
import io
import logging

logger = logging.getLogger(__name__)

def calculate_face_distance(face_encoding1: np.ndarray, face_encoding2: np.ndarray) -> float:
    """
    Calculate the distance between two face encodings
    
    Args:
        face_encoding1: First face encoding
        face_encoding2: Second face encoding
        
    Returns:
        Float distance between encodings (lower = more similar)
    """
    return face_recognition.face_distance([face_encoding1], face_encoding2)[0]

def calculate_cosine_similarity(embedding1: List[float], embedding2: List[float]) -> float:
    """
    Calculate cosine similarity between two face embeddings
    
    Args:
        embedding1: First face embedding
        embedding2: Second face embedding
        
    Returns:
        Cosine similarity score (0-1, higher = more similar)
    """
    try:
        # Convert to numpy arrays
        a = np.array(embedding1)
        b = np.array(embedding2)
        
        # Calculate cosine similarity
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
            
        similarity = dot_product / (norm_a * norm_b)
        return float(similarity)
        
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def resize_image_if_needed(image: Image.Image, max_width: int = 1920, max_height: int = 1080) -> Image.Image:
    """
    Resize image if it's larger than specified dimensions
    
    Args:
        image: PIL Image object
        max_width: Maximum width
        max_height: Maximum height
        
    Returns:
        Resized PIL Image
    """
    width, height = image.size
    
    if width <= max_width and height <= max_height:
        return image
    
    # Calculate aspect ratio
    aspect_ratio = width / height
    
    if width > max_width:
        width = max_width
        height = int(width / aspect_ratio)
    
    if height > max_height:
        height = max_height
        width = int(height * aspect_ratio)
    
    return image.resize((width, height), Image.Resampling.LANCZOS)

def validate_image_file(file_content: bytes, max_size: int = 10485760) -> bool:
    """
    Validate uploaded image file
    
    Args:
        file_content: Raw file bytes
        max_size: Maximum file size in bytes
        
    Returns:
        True if valid, False otherwise
    """
    try:
        # Check file size
        if len(file_content) > max_size:
            return False
        
        # Try to open as image
        image = Image.open(io.BytesIO(file_content))
        image.verify()
        
        return True
        
    except Exception:
        return False

def extract_face_features(image_path_or_array, model: str = "hog") -> Dict[str, Any]:
    """
    Extract comprehensive face features from image
    
    Args:
        image_path_or_array: Image file path or numpy array
        model: Face detection model ('hog' or 'cnn')
        
    Returns:
        Dictionary with face analysis results
    """
    try:
        # Load image if path provided
        if isinstance(image_path_or_array, str):
            image = face_recognition.load_image_file(image_path_or_array)
        else:
            image = image_path_or_array
        
        # Find face locations
        face_locations = face_recognition.face_locations(image, model=model)
        
        if not face_locations:
            return {
                "faces_found": 0,
                "face_locations": [],
                "face_encodings": [],
                "face_landmarks": []
            }
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(image, face_locations)
        
        # Get face landmarks
        face_landmarks = face_recognition.face_landmarks(image, face_locations)
        
        return {
            "faces_found": len(face_locations),
            "face_locations": face_locations,
            "face_encodings": [encoding.tolist() for encoding in face_encodings],
            "face_landmarks": face_landmarks
        }
        
    except Exception as e:
        logger.error(f"Error extracting face features: {e}")
        return {
            "faces_found": 0,
            "face_locations": [],
            "face_encodings": [],
            "face_landmarks": [],
            "error": str(e)
        }