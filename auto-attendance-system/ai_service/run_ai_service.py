#!/usr/bin/env python3
"""
Startup script for Auto Attendance AI Service - Phase 4
Configures and runs the FastAPI AI service with proper settings
"""

import uvicorn
import os
import sys
import logging
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('ai_service.log')
    ]
)

logger = logging.getLogger(__name__)

def main():
    """
    Main function to start the AI service
    """
    try:
        logger.info("🚀 Starting Auto Attendance AI Service - Phase 4")
        
        # Environment configuration
        host = os.getenv("AI_SERVICE_HOST", "0.0.0.0")
        port = int(os.getenv("AI_SERVICE_PORT", 8000))
        reload = os.getenv("ENVIRONMENT", "development") == "development"
        workers = int(os.getenv("WORKERS", 1))
        
        # Log configuration
        logger.info(f"📍 Host: {host}")
        logger.info(f"🔌 Port: {port}")
        logger.info(f"🔄 Reload: {reload}")
        logger.info(f"👥 Workers: {workers}")
        
        # Create required directories
        os.makedirs("static/uploads", exist_ok=True)
        os.makedirs("static/enrollments", exist_ok=True)
        logger.info("📁 Created static directories")
        
        # Start the server
        uvicorn.run(
            "main:app",
            host=host,
            port=port,
            reload=reload,
            workers=workers if not reload else 1,  # Single worker for reload mode
            log_level="info",
            access_log=True
        )
        
    except KeyboardInterrupt:
        logger.info("🛑 AI Service stopped by user")
    except Exception as e:
        logger.error(f"❌ Failed to start AI Service: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()