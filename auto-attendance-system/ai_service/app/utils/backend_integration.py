import aiohttp
import asyncio
import json
import os
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class BackendIntegration:
    """
    Integration service for communication between AI service and backend
    Handles data exchange for student enrollment and attendance updates
    """
    
    def __init__(self, backend_url: str = None, timeout: int = 30):
        self.backend_url = backend_url or os.getenv("BACKEND_API_URL", "http://localhost:5001")
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _ensure_session(self):
        """Ensure aiohttp session is created"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(timeout=self.timeout)
    
    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()
    
    async def fetch_class_students(self, class_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all students enrolled in a specific class from backend
        
        Args:
            class_id: The class identifier
            
        Returns:
            List of student data with IDs, names, and enrollment info
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/api/students/class/{class_id}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    students = data.get('students', [])
                    logger.info(f"✅ Fetched {len(students)} students for class {class_id}")
                    return students
                else:
                    logger.error(f"❌ Failed to fetch students: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error fetching class students: {e}")
            return []
    
    async def fetch_student_images(self, student_id: str) -> List[str]:
        """
        Fetch enrolled face images for a specific student
        
        Args:
            student_id: The student identifier
            
        Returns:
            List of image URLs or base64 encoded images
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/api/students/{student_id}/images"
            async with self.session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    images = data.get('images', [])
                    logger.info(f"✅ Fetched {len(images)} images for student {student_id}")
                    return images
                else:
                    logger.error(f"❌ Failed to fetch student images: {response.status}")
                    return []
                    
        except Exception as e:
            logger.error(f"❌ Error fetching student images: {e}")
            return []
    
    async def update_attendance_records(self, session_id: str, attendance_data: List[Dict[str, Any]]) -> bool:
        """
        Update attendance records in the backend based on AI recognition results
        
        Args:
            session_id: The session identifier
            attendance_data: List of attendance records with student IDs and status
            
        Returns:
            True if successful, False otherwise
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/api/attendance/bulk-update"
            
            payload = {
                "session_id": session_id,
                "attendance_records": attendance_data,
                "recognition_timestamp": datetime.utcnow().isoformat(),
                "recognition_method": "ai_face_recognition"
            }
            
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    result = await response.json()
                    updated_count = result.get('updated_count', 0)
                    logger.info(f"✅ Updated {updated_count} attendance records for session {session_id}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Failed to update attendance: {response.status} - {error_text}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error updating attendance records: {e}")
            return False
    
    async def notify_recognition_complete(self, session_id: str, results: Dict[str, Any]) -> bool:
        """
        Notify backend that face recognition analysis is complete
        
        Args:
            session_id: The session identifier
            results: Recognition results and statistics
            
        Returns:
            True if successful, False otherwise
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/api/sessions/{session_id}/recognition-complete"
            
            payload = {
                "recognition_results": results,
                "completion_timestamp": datetime.utcnow().isoformat(),
                "ai_service_version": "4.0.0"
            }
            
            async with self.session.post(url, json=payload) as response:
                if response.status == 200:
                    logger.info(f"✅ Notified backend of recognition completion for session {session_id}")
                    return True
                else:
                    logger.error(f"❌ Failed to notify recognition completion: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Error notifying recognition completion: {e}")
            return False
    
    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get session information from backend
        
        Args:
            session_id: The session identifier
            
        Returns:
            Session data or None if not found
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/api/sessions/{session_id}"
            async with self.session.get(url) as response:
                if response.status == 200:
                    session_data = await response.json()
                    logger.info(f"✅ Fetched session info for {session_id}")
                    return session_data
                else:
                    logger.error(f"❌ Failed to fetch session info: {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"❌ Error fetching session info: {e}")
            return None
    
    async def health_check(self) -> bool:
        """
        Check if backend is reachable
        
        Returns:
            True if backend is healthy, False otherwise
        """
        try:
            await self._ensure_session()
            
            url = f"{self.backend_url}/health"
            async with self.session.get(url) as response:
                return response.status == 200
                
        except Exception as e:
            logger.error(f"❌ Backend health check failed: {e}")
            return False

# Global backend integration instance
backend_integration: Optional[BackendIntegration] = None

def get_backend_integration() -> BackendIntegration:
    """Get or create backend integration instance"""
    global backend_integration
    if backend_integration is None:
        backend_integration = BackendIntegration()
    return backend_integration

async def cleanup_backend_integration():
    """Cleanup backend integration resources"""
    global backend_integration
    if backend_integration:
        await backend_integration.close()
        backend_integration = None