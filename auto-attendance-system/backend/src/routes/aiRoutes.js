const express = require('express');
const router = express.Router();

// Import controllers
const {
  analyzePhoto,
  getProcessingStatus,
  reprocessPhoto
} = require('../controllers/aiController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  uploadAIPhoto,
  handleUploadError
} = require('../middleware/uploadMiddleware');
const { body, param } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Validation middleware for AI routes
const validateAnalyzePhoto = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId')
];

const validateSessionId = [
  param('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId')
];

/**
 * @route   POST /api/ai/analyze-photo
 * @desc    Analyze uploaded photo for face recognition
 * @access  Private (Teacher only)
 */
router.post('/analyze-photo', 
  uploadAIPhoto,
  handleUploadError,
  validateAnalyzePhoto,
  analyzePhoto
);

/**
 * @route   GET /api/ai/status/:sessionId
 * @desc    Get AI processing status for a session
 * @access  Private (Teacher only)
 */
router.get('/status/:sessionId', 
  validateSessionId,
  getProcessingStatus
);

/**
 * @route   POST /api/ai/reprocess/:sessionId
 * @desc    Reprocess photo with AI (for corrections)
 * @access  Private (Teacher only)
 */
router.post('/reprocess/:sessionId', 
  validateSessionId,
  reprocessPhoto
);

module.exports = router;