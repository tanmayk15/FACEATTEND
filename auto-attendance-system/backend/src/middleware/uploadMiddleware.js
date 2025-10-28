const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * File upload middleware for session photos and AI analysis
 */

// Ensure upload directories exist
const uploadDirs = [
  'uploads/sessions',
  'uploads/ai-analysis',
  'uploads/profile-photos'
];

uploadDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '../../', dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Storage configuration for session photos
const sessionPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/sessions'));
  },
  filename: (req, file, cb) => {
    // Generate unique filename: sessionId_timestamp_originalname
    const sessionId = req.params.id || req.body.sessionId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `session_${sessionId}_${timestamp}_${name}${ext}`);
  }
});

// Storage configuration for AI analysis photos
const aiAnalysisStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/ai-analysis'));
  },
  filename: (req, file, cb) => {
    const sessionId = req.body.sessionId || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `ai_analysis_${sessionId}_${timestamp}${ext}`);
  }
});

// File filter function to allow only images
const imageFileFilter = (req, file, cb) => {
  // Check if file is an image
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

// File size limits
const fileSizeLimits = {
  sessionPhoto: 10 * 1024 * 1024, // 10MB
  aiAnalysis: 15 * 1024 * 1024    // 15MB
};

// Multer configuration for session photos
const uploadSessionPhoto = multer({
  storage: sessionPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: fileSizeLimits.sessionPhoto,
    files: 1
  }
}).single('photo');

// Multer configuration for AI analysis photos
const uploadAIPhoto = multer({
  storage: aiAnalysisStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: fileSizeLimits.aiAnalysis,
    files: 1
  }
}).single('photo');

// Error handling middleware for multer
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    switch (error.code) {
      case 'LIMIT_FILE_SIZE':
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size allowed is 10MB for session photos and 15MB for AI analysis.'
        });
      case 'LIMIT_FILE_COUNT':
        return res.status(400).json({
          success: false,
          message: 'Too many files. Only one file is allowed.'
        });
      case 'LIMIT_UNEXPECTED_FILE':
        return res.status(400).json({
          success: false,
          message: 'Unexpected file field. Use "photo" as the field name.'
        });
      default:
        return res.status(400).json({
          success: false,
          message: 'File upload error: ' + error.message
        });
    }
  } else if (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'File upload failed'
    });
  }
  next();
};

// Middleware to validate uploaded file
const validateUploadedFile = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  // Additional validation can be added here
  // e.g., check image dimensions, format, etc.
  
  next();
};

// Clean up old files (utility function)
const cleanupOldFiles = async (directory, maxAgeInDays = 30) => {
  try {
    const uploadPath = path.join(__dirname, '../../uploads', directory);
    const files = await fs.promises.readdir(uploadPath);
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds
    
    for (const file of files) {
      const filePath = path.join(uploadPath, file);
      const stats = await fs.promises.stat(filePath);
      
      if (Date.now() - stats.mtime.getTime() > maxAge) {
        await fs.promises.unlink(filePath);
        console.log(`Cleaned up old file: ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up old files:', error);
  }
};

module.exports = {
  uploadSessionPhoto,
  uploadAIPhoto,
  handleUploadError,
  validateUploadedFile,
  cleanupOldFiles
};