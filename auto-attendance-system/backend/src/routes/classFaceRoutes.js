const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  getClassStudentsFaceData
} = require('../controllers/studentFaceController');

const router = express.Router();

/**
 * @route   GET /api/classes/:classId/students/face-data
 * @desc    Get all students in a class with their face data status
 * @access  Private (Teacher only)
 */
router.get(
  '/:classId/students/face-data',
  authMiddleware,
  getClassStudentsFaceData
);

module.exports = router;