import numpy as np
from typing import List, Tuple
import cv2
from sklearn.metrics.pairwise import cosine_similarity
import logging

logger = logging.getLogger(__name__)

def calculate_cosine_similarity(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculate cosine similarity between two face embeddings
    
    Args:
        embedding1: First face embedding
        embedding2: Second face embedding
        
    Returns:
        Cosine similarity score (0-1, higher is more similar)
    """
    try:
        # Reshape embeddings for sklearn
        emb1 = embedding1.reshape(1, -1)
        emb2 = embedding2.reshape(1, -1)
        
        # Calculate cosine similarity
        similarity = cosine_similarity(emb1, emb2)[0][0]
        
        # Ensure result is between 0 and 1
        similarity = max(0, min(1, similarity))
        
        return float(similarity)
        
    except Exception as e:
        logger.error(f"Error calculating cosine similarity: {e}")
        return 0.0

def euclidean_distance(embedding1: np.ndarray, embedding2: np.ndarray) -> float:
    """
    Calculate Euclidean distance between two face embeddings
    
    Args:
        embedding1: First face embedding
        embedding2: Second face embedding
        
    Returns:
        Euclidean distance (lower is more similar)
    """
    try:
        distance = np.linalg.norm(embedding1 - embedding2)
        return float(distance)
        
    except Exception as e:
        logger.error(f"Error calculating Euclidean distance: {e}")
        return float('inf')

def find_best_matches(query_embedding: np.ndarray, 
                     database_embeddings: List[np.ndarray],
                     student_ids: List[str],
                     top_k: int = 3,
                     method: str = 'cosine') -> List[Tuple[str, float]]:
    """
    Find the best matching faces from a database
    
    Args:
        query_embedding: Query face embedding
        database_embeddings: List of database embeddings
        student_ids: Corresponding student IDs
        top_k: Number of top matches to return
        method: Similarity method ('cosine' or 'euclidean')
        
    Returns:
        List of (student_id, similarity_score) tuples, sorted by best match
    """
    try:
        if len(database_embeddings) == 0:
            return []
        
        similarities = []
        
        for i, db_embedding in enumerate(database_embeddings):
            if method == 'cosine':
                score = calculate_cosine_similarity(query_embedding, db_embedding)
            else:  # euclidean
                distance = euclidean_distance(query_embedding, db_embedding)
                # Convert distance to similarity (inverse relationship)
                score = 1.0 / (1.0 + distance)
            
            similarities.append((student_ids[i], score))
        
        # Sort by similarity score (descending)
        similarities.sort(key=lambda x: x[1], reverse=True)
        
        return similarities[:top_k]
        
    except Exception as e:
        logger.error(f"Error finding best matches: {e}")
        return []

def preprocess_image(image: np.ndarray, target_size: Tuple[int, int] = None) -> np.ndarray:
    """
    Preprocess image for face recognition
    
    Args:
        image: Input image as numpy array
        target_size: Target size for resizing (width, height)
        
    Returns:
        Preprocessed image
    """
    try:
        # Convert to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            # Assuming BGR format from OpenCV
            processed = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            processed = image.copy()
        
        # Resize if target size is specified
        if target_size:
            processed = cv2.resize(processed, target_size)
        
        # Normalize pixel values to [0, 1]
        if processed.dtype != np.float32:
            processed = processed.astype(np.float32) / 255.0
        
        return processed
        
    except Exception as e:
        logger.error(f"Error preprocessing image: {e}")
        return image

def draw_face_boxes(image: np.ndarray, faces: List[dict], 
                   color: Tuple[int, int, int] = (0, 255, 0), 
                   thickness: int = 2) -> np.ndarray:
    """
    Draw bounding boxes around detected faces
    
    Args:
        image: Input image
        faces: List of face detection results with 'bbox' key
        color: Box color in BGR format
        thickness: Line thickness
        
    Returns:
        Image with drawn bounding boxes
    """
    try:
        result_image = image.copy()
        
        for face in faces:
            bbox = face.get('bbox', [])
            if len(bbox) == 4:
                x1, y1, x2, y2 = bbox
                cv2.rectangle(result_image, (x1, y1), (x2, y2), color, thickness)
                
                # Add confidence or name label if available
                label = ""
                if 'name' in face:
                    label = face['name']
                elif 'confidence' in face:
                    label = f"{face['confidence']:.2f}"
                
                if label:
                    cv2.putText(result_image, label, (x1, y1 - 10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, thickness)
        
        return result_image
        
    except Exception as e:
        logger.error(f"Error drawing face boxes: {e}")
        return image

def validate_embedding(embedding: np.ndarray, expected_dim: int = 512) -> bool:
    """
    Validate face embedding format and dimensions
    
    Args:
        embedding: Face embedding to validate
        expected_dim: Expected embedding dimension
        
    Returns:
        True if valid, False otherwise
    """
    try:
        if not isinstance(embedding, np.ndarray):
            return False
        
        if embedding.shape != (expected_dim,):
            return False
        
        if not np.isfinite(embedding).all():
            return False
        
        # Check if embedding is normalized (optional)
        norm = np.linalg.norm(embedding)
        if abs(norm - 1.0) > 0.1:  # Allow some tolerance
            logger.warning(f"Embedding norm is {norm:.3f}, expected ~1.0")
        
        return True
        
    except Exception as e:
        logger.error(f"Error validating embedding: {e}")
        return False

def normalize_embedding(embedding: np.ndarray) -> np.ndarray:
    """
    Normalize face embedding to unit length
    
    Args:
        embedding: Input embedding
        
    Returns:
        Normalized embedding
    """
    try:
        norm = np.linalg.norm(embedding)
        if norm > 0:
            return embedding / norm
        else:
            return embedding
    except Exception as e:
        logger.error(f"Error normalizing embedding: {e}")
        return embedding

def batch_process_similarities(query_embeddings: List[np.ndarray],
                             database_embeddings: List[np.ndarray]) -> np.ndarray:
    """
    Efficiently compute similarities between multiple query and database embeddings
    
    Args:
        query_embeddings: List of query embeddings
        database_embeddings: List of database embeddings
        
    Returns:
        Similarity matrix (queries x database)
    """
    try:
        if not query_embeddings or not database_embeddings:
            return np.array([])
        
        # Convert to arrays
        queries = np.array(query_embeddings)
        database = np.array(database_embeddings)
        
        # Compute cosine similarity matrix
        similarities = cosine_similarity(queries, database)
        
        return similarities
        
    except Exception as e:
        logger.error(f"Error in batch similarity computation: {e}")
        return np.array([])

class FaceMatchingConfig:
    """Configuration for face matching thresholds and parameters"""
    
    # Recognition thresholds
    HIGH_CONFIDENCE_THRESHOLD = 0.85
    MEDIUM_CONFIDENCE_THRESHOLD = 0.70
    LOW_CONFIDENCE_THRESHOLD = 0.60
    
    # Face detection parameters
    MIN_FACE_SIZE = 50
    MAX_FACES_PER_IMAGE = 100
    
    # Embedding parameters
    EMBEDDING_DIM = 512
    NORMALIZATION_REQUIRED = True
    
    # Matching parameters
    MAX_CANDIDATES = 5
    USE_COSINE_SIMILARITY = True
    
    @classmethod
    def get_status_from_confidence(cls, confidence: float) -> str:
        """Determine attendance status based on confidence level"""
        if confidence >= cls.HIGH_CONFIDENCE_THRESHOLD:
            return "Present"
        elif confidence >= cls.MEDIUM_CONFIDENCE_THRESHOLD:
            return "Uncertain"
        elif confidence >= cls.LOW_CONFIDENCE_THRESHOLD:
            return "Low_Confidence"
        else:
            return "Not_Recognized"
    
    @classmethod
    def get_color_from_confidence(cls, confidence: float) -> Tuple[int, int, int]:
        """Get BGR color based on confidence level"""
        if confidence >= cls.HIGH_CONFIDENCE_THRESHOLD:
            return (0, 255, 0)  # Green
        elif confidence >= cls.MEDIUM_CONFIDENCE_THRESHOLD:
            return (0, 255, 255)  # Yellow
        elif confidence >= cls.LOW_CONFIDENCE_THRESHOLD:
            return (0, 165, 255)  # Orange
        else:
            return (0, 0, 255)  # Red