const express = require('express');
const router = express.Router();

// Import controllers
const {
  createSession,
  getClassSessions,
  getSessionById,
  updateSessionStatus,
  uploadSessionPhoto,
  deleteSession,
  testAIService,
  testAIServiceDebug,
  analyzeAndMarkAttendance,
  getAutoAttendanceResults
} = require('../controllers/sessionController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateCreateSession,
  validateUpdateSessionStatus,
  validateSessionQueries,
  validateSessionId,
  validateClassId
} = require('../middleware/sessionValidation');
const {
  uploadSessionPhoto: uploadMiddleware,
  handleUploadError,
  validateUploadedFile
} = require('../middleware/uploadMiddleware');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   GET /api/sessions/ai-service/health
 * @desc    Test AI service connectivity
 * @access  Private (Teacher only)
 */
router.get('/ai-service/health', testAIService);

/**
 * @route   GET /api/sessions/ai-service/test
 * @desc    Test AI service connectivity with debug info
 * @access  Private (Teacher only)
 */
router.get('/ai-service/test', testAIServiceDebug);

/**
 * @route   POST /api/sessions
 * @desc    Create a new attendance session
 * @access  Private (Teacher only)
 */
router.post('/', validateCreateSession, createSession);

/**
 * @route   GET /api/sessions/class/:classId
 * @desc    Get sessions for a specific class
 * @access  Private (Teacher or enrolled student)
 */
router.get('/class/:classId', 
  validateClassId,
  validateSessionQueries,
  getClassSessions
);

/**
 * @route   GET /api/sessions/:id
 * @desc    Get single session details
 * @access  Private (Teacher or enrolled student)
 */
router.get('/:id', validateSessionId, getSessionById);

/**
 * @route   PUT /api/sessions/:id/status
 * @desc    Update session status
 * @access  Private (Teacher only)
 */
router.put('/:id/status', 
  validateSessionId,
  validateUpdateSessionStatus,
  updateSessionStatus
);

/**
 * @route   POST /api/sessions/:id/photo
 * @desc    Upload photo for session
 * @access  Private (Teacher only)
 */
router.post('/:id/photo', 
  validateSessionId,
  uploadMiddleware,
  handleUploadError,
  uploadSessionPhoto
);

/**
 * @route   POST /api/sessions/:id/auto-attendance
 * @desc    Automatically analyze photo and mark attendance using AI
 * @access  Private (Teacher only)
 */
router.post('/:id/auto-attendance', 
  validateSessionId,
  analyzeAndMarkAttendance
);

/**
 * @route   GET /api/sessions/:id/auto-attendance-results
 * @desc    Get automatic attendance analysis results
 * @access  Private (Teacher only)
 */
router.get('/:id/auto-attendance-results', 
  validateSessionId,
  getAutoAttendanceResults
);

/**
 * @route   DELETE /api/sessions/:id
 * @desc    Delete session
 * @access  Private (Teacher only)
 */
router.delete('/:id', validateSessionId, deleteSession);

module.exports = router;