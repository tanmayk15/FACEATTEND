import cv2
import numpy as np
from PIL import Image
from typing import Tuple, Optional, List, Dict, Any
import base64
import io
import logging

logger = logging.getLogger(__name__)

class ImageProcessor:
    """Utility class for image processing operations"""
    
    @staticmethod
    def load_image_from_bytes(image_bytes: bytes) -> Optional[np.ndarray]:
        """
        Load image from bytes data
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Image as numpy array (BGR format) or None if failed
        """
        try:
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_bytes, np.uint8)
            
            # Decode image
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                logger.error("Failed to decode image from bytes")
                return None
            
            logger.info(f"Loaded image with shape: {image.shape}")
            return image
            
        except Exception as e:
            logger.error(f"Error loading image from bytes: {e}")
            return None
    
    @staticmethod
    def load_image_from_base64(base64_string: str) -> Optional[np.ndarray]:
        """
        Load image from base64 encoded string
        
        Args:
            base64_string: Base64 encoded image string
            
        Returns:
            Image as numpy array or None if failed
        """
        try:
            # Remove data URL prefix if present
            if base64_string.startswith('data:image'):
                base64_string = base64_string.split(',')[1]
            
            # Decode base64
            image_bytes = base64.b64decode(base64_string)
            
            return ImageProcessor.load_image_from_bytes(image_bytes)
            
        except Exception as e:
            logger.error(f"Error loading image from base64: {e}")
            return None
    
    @staticmethod
    def resize_image(image: np.ndarray, 
                    target_size: Tuple[int, int], 
                    maintain_aspect_ratio: bool = True) -> np.ndarray:
        """
        Resize image to target size
        
        Args:
            image: Input image
            target_size: Target (width, height)
            maintain_aspect_ratio: Whether to maintain aspect ratio
            
        Returns:
            Resized image
        """
        try:
            h, w = image.shape[:2]
            target_w, target_h = target_size
            
            if maintain_aspect_ratio:
                # Calculate scaling factor
                scale = min(target_w / w, target_h / h)
                
                # Calculate new dimensions
                new_w = int(w * scale)
                new_h = int(h * scale)
                
                # Resize image
                resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
                
                # Create canvas and center the image
                canvas = np.zeros((target_h, target_w, image.shape[2]), dtype=image.dtype)
                y_offset = (target_h - new_h) // 2
                x_offset = (target_w - new_w) // 2
                canvas[y_offset:y_offset + new_h, x_offset:x_offset + new_w] = resized
                
                return canvas
            else:
                return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
                
        except Exception as e:
            logger.error(f"Error resizing image: {e}")
            return image
    
    @staticmethod
    def enhance_image_quality(image: np.ndarray) -> np.ndarray:
        """
        Enhance image quality for better face recognition
        
        Args:
            image: Input image
            
        Returns:
            Enhanced image
        """
        try:
            # Convert to LAB color space for better processing
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            
            # Apply CLAHE (Contrast Limited Adaptive Histogram Equalization) to L channel
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # Merge channels back
            enhanced_lab = cv2.merge([l, a, b])
            enhanced = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
            
            # Apply slight Gaussian blur to reduce noise
            enhanced = cv2.GaussianBlur(enhanced, (3, 3), 0)
            
            return enhanced
            
        except Exception as e:
            logger.error(f"Error enhancing image: {e}")
            return image
    
    @staticmethod
    def extract_face_region(image: np.ndarray, 
                           bbox: List[int], 
                           padding: int = 20) -> Optional[np.ndarray]:
        """
        Extract face region from image with padding
        
        Args:
            image: Source image
            bbox: Bounding box [x1, y1, x2, y2]
            padding: Padding around the face
            
        Returns:
            Extracted face region or None if failed
        """
        try:
            h, w = image.shape[:2]
            x1, y1, x2, y2 = bbox
            
            # Add padding
            x1 = max(0, x1 - padding)
            y1 = max(0, y1 - padding)
            x2 = min(w, x2 + padding)
            y2 = min(h, y2 + padding)
            
            # Extract region
            face_region = image[y1:y2, x1:x2]
            
            if face_region.size == 0:
                return None
            
            return face_region
            
        except Exception as e:
            logger.error(f"Error extracting face region: {e}")
            return None
    
    @staticmethod
    def annotate_image(image: np.ndarray, 
                      detections: List[Dict[str, Any]], 
                      show_confidence: bool = True) -> np.ndarray:
        """
        Annotate image with detection results
        
        Args:
            image: Input image
            detections: List of detection results
            show_confidence: Whether to show confidence scores
            
        Returns:
            Annotated image
        """
        try:
            annotated = image.copy()
            
            for detection in detections:
                bbox = detection.get('bbox', [])
                if len(bbox) != 4:
                    continue
                
                x1, y1, x2, y2 = bbox
                confidence = detection.get('confidence', 0)
                name = detection.get('name', 'Unknown')
                
                # Choose color based on confidence
                if confidence >= 0.85:
                    color = (0, 255, 0)  # Green
                elif confidence >= 0.70:
                    color = (0, 255, 255)  # Yellow
                else:
                    color = (0, 0, 255)  # Red
                
                # Draw bounding box
                cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
                
                # Prepare label text
                if show_confidence:
                    label = f"{name} ({confidence:.2f})"
                else:
                    label = name
                
                # Draw label background
                (text_width, text_height), _ = cv2.getTextSize(
                    label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                )
                cv2.rectangle(annotated, (x1, y1 - text_height - 10), 
                            (x1 + text_width, y1), color, -1)
                
                # Draw label text
                cv2.putText(annotated, label, (x1, y1 - 5), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            
            return annotated
            
        except Exception as e:
            logger.error(f"Error annotating image: {e}")
            return image
    
    @staticmethod
    def save_image_to_bytes(image: np.ndarray, format: str = 'JPEG') -> Optional[bytes]:
        """
        Convert image to bytes
        
        Args:
            image: Input image
            format: Output format ('JPEG', 'PNG')
            
        Returns:
            Image as bytes or None if failed
        """
        try:
            # Encode image
            if format.upper() == 'JPEG':
                _, encoded = cv2.imencode('.jpg', image)
            elif format.upper() == 'PNG':
                _, encoded = cv2.imencode('.png', image)
            else:
                logger.error(f"Unsupported format: {format}")
                return None
            
            return encoded.tobytes()
            
        except Exception as e:
            logger.error(f"Error saving image to bytes: {e}")
            return None
    
    @staticmethod
    def image_to_base64(image: np.ndarray, format: str = 'JPEG') -> Optional[str]:
        """
        Convert image to base64 string
        
        Args:
            image: Input image
            format: Output format
            
        Returns:
            Base64 encoded string or None if failed
        """
        try:
            image_bytes = ImageProcessor.save_image_to_bytes(image, format)
            if image_bytes:
                return base64.b64encode(image_bytes).decode('utf-8')
            return None
            
        except Exception as e:
            logger.error(f"Error converting image to base64: {e}")
            return None
    
    @staticmethod
    def validate_image(image: np.ndarray, 
                      min_size: Tuple[int, int] = (100, 100),
                      max_size: Tuple[int, int] = (4000, 4000)) -> bool:
        """
        Validate image dimensions and format
        
        Args:
            image: Image to validate
            min_size: Minimum (width, height)
            max_size: Maximum (width, height)
            
        Returns:
            True if valid, False otherwise
        """
        try:
            if image is None:
                return False
            
            h, w = image.shape[:2]
            min_w, min_h = min_size
            max_w, max_h = max_size
            
            if w < min_w or h < min_h:
                logger.warning(f"Image too small: {w}x{h}, minimum: {min_w}x{min_h}")
                return False
            
            if w > max_w or h > max_h:
                logger.warning(f"Image too large: {w}x{h}, maximum: {max_w}x{max_h}")
                return False
            
            # Check if image has valid data
            if image.size == 0:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating image: {e}")
            return False
    
    @staticmethod
    def create_thumbnail(image: np.ndarray, size: Tuple[int, int] = (150, 150)) -> np.ndarray:
        """
        Create thumbnail of the image
        
        Args:
            image: Input image
            size: Thumbnail size
            
        Returns:
            Thumbnail image
        """
        try:
            return ImageProcessor.resize_image(image, size, maintain_aspect_ratio=True)
        except Exception as e:
            logger.error(f"Error creating thumbnail: {e}")
            return image

def create_image_grid(images: List[np.ndarray], 
                     grid_size: Tuple[int, int],
                     cell_size: Tuple[int, int] = (150, 150)) -> np.ndarray:
    """
    Create a grid of images for visualization
    
    Args:
        images: List of images to arrange
        grid_size: Grid dimensions (cols, rows)
        cell_size: Size of each cell
        
    Returns:
        Grid image
    """
    try:
        cols, rows = grid_size
        cell_w, cell_h = cell_size
        
        # Create canvas
        grid_image = np.zeros((rows * cell_h, cols * cell_w, 3), dtype=np.uint8)
        
        for i, image in enumerate(images[:cols * rows]):
            row = i // cols
            col = i % cols
            
            # Resize image to cell size
            resized = ImageProcessor.resize_image(image, cell_size)
            
            # Place in grid
            y1 = row * cell_h
            y2 = y1 + cell_h
            x1 = col * cell_w
            x2 = x1 + cell_w
            
            grid_image[y1:y2, x1:x2] = resized
        
        return grid_image
        
    except Exception as e:
        logger.error(f"Error creating image grid: {e}")
        return np.zeros((100, 100, 3), dtype=np.uint8)