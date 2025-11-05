const express = require('express');
const router = express.Router();

// Import controllers
const {
  markAttendance,
  bulkMarkAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getClassAttendanceSummary,
  exportAttendanceData,
  getMyAttendance
} = require('../controllers/attendanceController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateMarkAttendance,
  validateBulkMarkAttendance,
  validateAttendanceQueries,
  validateSessionId,
  validateStudentId,
  validateClassId,
  validateDateRange
} = require('../middleware/attendanceValidation');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/attendance/mark
 * @desc    Mark attendance for a student in a session
 * @access  Private (Teacher or Student)
 */
router.post('/mark', validateMarkAttendance, markAttendance);

/**
 * @route   POST /api/attendance/bulk-mark
 * @desc    Bulk mark attendance for multiple students
 * @access  Private (Teacher only)
 */
router.post('/bulk-mark', validateBulkMarkAttendance, bulkMarkAttendance);

/**
 * @route   GET /api/attendance/session/:sessionId
 * @desc    Get attendance for a specific session
 * @access  Private (Teacher or enrolled student)
 */
router.get('/session/:sessionId', 
  validateSessionId,
  getSessionAttendance
);

/**
 * @route   GET /api/attendance/my-attendance/:classId
 * @desc    Get student's own attendance records for a specific class
 * @access  Private (Student only)
 */
router.get('/my-attendance/:classId', 
  validateClassId,
  getMyAttendance
);

/**
 * @route   GET /api/attendance/student/:studentId
 * @desc    Get attendance history for a student
 * @access  Private (Teacher, Student viewing own records)
 */
router.get('/student/:studentId', 
  validateStudentId,
  validateAttendanceQueries,
  validateDateRange,
  getStudentAttendance
);

/**
 * @route   GET /api/attendance/class/:classId/summary
 * @desc    Get attendance summary for a class
 * @access  Private (Teacher only)
 */
router.get('/class/:classId/summary', 
  validateClassId,
  validateAttendanceQueries,
  validateDateRange,
  getClassAttendanceSummary
);

/**
 * @route   GET /api/attendance/export/:classId
 * @desc    Export attendance data
 * @access  Private (Teacher only)
 */
router.get('/export/:classId', 
  validateClassId,
  validateAttendanceQueries,
  validateDateRange,
  exportAttendanceData
);

module.exports = router;