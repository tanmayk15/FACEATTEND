#!/usr/bin/env python3
"""
Test script for Auto Attendance AI Service - Phase 4
Tests the main AI service endpoints and functionality
"""

import asyncio
import aiohttp
import json
import os
import sys
from pathlib import Path
import base64
from io import BytesIO
from PIL import Image, ImageDraw
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIServiceTester:
    """Test client for AI service endpoints"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def create_test_image(self, size=(400, 300), with_face=True):
        """Create a simple test image with optional face-like rectangle"""
        image = Image.new('RGB', size, color='lightblue')
        draw = ImageDraw.Draw(image)
        
        if with_face:
            # Draw a simple face-like rectangle
            face_x = size[0] // 2 - 50
            face_y = size[1] // 2 - 60
            face_w, face_h = 100, 120
            
            # Face outline
            draw.rectangle([face_x, face_y, face_x + face_w, face_y + face_h], 
                         outline='black', width=2)
            
            # Eyes
            draw.ellipse([face_x + 20, face_y + 25, face_x + 35, face_y + 40], fill='black')
            draw.ellipse([face_x + 65, face_y + 25, face_x + 80, face_y + 40], fill='black')
            
            # Nose
            draw.line([face_x + 50, face_y + 50, face_x + 50, face_y + 70], fill='black', width=2)
            
            # Mouth
            draw.arc([face_x + 30, face_y + 70, face_x + 70, face_y + 90], 0, 180, fill='black', width=2)
        
        # Convert to bytes
        buffer = BytesIO()
        image.save(buffer, format='JPEG')
        return buffer.getvalue()
    
    async def test_health_check(self):
        """Test the health check endpoint"""
        logger.info("🏥 Testing health check...")
        try:
            async with self.session.get(f"{self.base_url}/health") as response:
                data = await response.json()
                logger.info(f"✅ Health check: {data.get('status', 'unknown')}")
                return response.status == 200
        except Exception as e:
            logger.error(f"❌ Health check failed: {e}")
            return False
    
    async def test_root_endpoint(self):
        """Test the root endpoint"""
        logger.info("🏠 Testing root endpoint...")
        try:
            async with self.session.get(f"{self.base_url}/") as response:
                data = await response.json()
                logger.info(f"✅ Root endpoint: {data.get('message', 'unknown')}")
                return response.status == 200
        except Exception as e:
            logger.error(f"❌ Root endpoint failed: {e}")
            return False
    
    async def test_model_status(self):
        """Test the model status endpoint"""
        logger.info("🤖 Testing model status...")
        try:
            async with self.session.get(f"{self.base_url}/models/status") as response:
                data = await response.json()
                logger.info(f"✅ Model status: {data.get('ready', False)}")
                return response.status == 200
        except Exception as e:
            logger.error(f"❌ Model status failed: {e}")
            return False
    
    async def test_enroll_student(self):
        """Test student enrollment endpoint"""
        logger.info("👤 Testing student enrollment...")
        try:
            # Create test image
            image_data = self.create_test_image(with_face=True)
            
            # Prepare form data
            data = aiohttp.FormData()
            data.add_field('file', image_data, filename='test_student.jpg', content_type='image/jpeg')
            data.add_field('student_id', 'TEST001')
            data.add_field('student_name', 'Test Student')
            
            async with self.session.post(f"{self.base_url}/enroll-student", data=data) as response:
                result = await response.json()
                
                if response.status == 200:
                    logger.info(f"✅ Student enrolled: {result.get('student_name', 'unknown')}")
                    return True
                else:
                    logger.error(f"❌ Enrollment failed: {result.get('detail', 'unknown error')}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Enrollment test failed: {e}")
            return False
    
    async def test_analyze_classroom(self):
        """Test classroom analysis endpoint"""
        logger.info("📸 Testing classroom analysis...")
        try:
            # Create test classroom image
            image_data = self.create_test_image(size=(800, 600), with_face=True)
            
            # Prepare form data
            data = aiohttp.FormData()
            data.add_field('file', image_data, filename='test_classroom.jpg', content_type='image/jpeg')
            data.add_field('class_id', 'CS101')
            data.add_field('session_id', 'SES001')
            data.add_field('threshold', '0.7')
            
            async with self.session.post(f"{self.base_url}/analyze", data=data) as response:
                result = await response.json()
                
                if response.status == 200:
                    recognized = len(result.get('recognized_faces', []))
                    total = result.get('total_detected', 0)
                    logger.info(f"✅ Analysis complete: {recognized}/{total} faces recognized")
                    return True
                else:
                    logger.error(f"❌ Analysis failed: {result.get('detail', 'unknown error')}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Analysis test failed: {e}")
            return False
    
    async def test_database_info(self):
        """Test database info endpoint"""
        logger.info("💾 Testing database info...")
        try:
            async with self.session.get(f"{self.base_url}/database/info") as response:
                data = await response.json()
                
                if response.status == 200:
                    db_info = data.get('database_info', {})
                    student_count = db_info.get('student_count', 0)
                    logger.info(f"✅ Database info: {student_count} students enrolled")
                    return True
                else:
                    logger.error(f"❌ Database info failed: {response.status}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Database info test failed: {e}")
            return False
    
    async def run_all_tests(self):
        """Run all tests in sequence"""
        logger.info("🚀 Starting AI Service tests...")
        
        tests = [
            ("Health Check", self.test_health_check),
            ("Root Endpoint", self.test_root_endpoint),
            ("Model Status", self.test_model_status),
            ("Database Info", self.test_database_info),
            ("Student Enrollment", self.test_enroll_student),
            ("Classroom Analysis", self.test_analyze_classroom),
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                result = await test_func()
                results[test_name] = result
                if result:
                    logger.info(f"✅ {test_name}: PASSED")
                else:
                    logger.error(f"❌ {test_name}: FAILED")
            except Exception as e:
                logger.error(f"❌ {test_name}: ERROR - {e}")
                results[test_name] = False
        
        # Summary
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        logger.info(f"\n📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            logger.info("🎉 All tests passed! AI Service is working correctly.")
        else:
            logger.warning(f"⚠️ {total - passed} tests failed. Check the logs above.")
        
        return passed == total

async def main():
    """Main test function"""
    print("🤖 Auto Attendance AI Service - Test Suite")
    print("=" * 50)
    
    # Check if service is running
    async with AIServiceTester() as tester:
        success = await tester.run_all_tests()
    
    if success:
        print("\n✅ AI Service is ready for Phase 4!")
        sys.exit(0)
    else:
        print("\n❌ AI Service has issues. Check the service logs.")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())