const express = require('express');
const router = express.Router();

// Import controllers
const {
  createClass,
  getTeacherClasses,
  getStudentClasses,
  getClassById,
  enrollStudents,
  removeStudent,
  updateClass,
  deleteClass
} = require('../controllers/classController');

// Import middleware
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  validateCreateClass,
  validateUpdateClass,
  validateEnrollStudents,
  validateObjectId,
  validatePagination
} = require('../middleware/classValidation');

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * @route   POST /api/classes
 * @desc    Create a new class
 * @access  Private (Teacher only)
 */
router.post('/', validateCreateClass, createClass);

/**
 * @route   GET /api/classes
 * @desc    Get all classes for current teacher
 * @access  Private (Teacher only)
 */
router.get('/', validatePagination, getTeacherClasses);

/**
 * @route   GET /api/classes/student
 * @desc    Get all classes for current student
 * @access  Private (Student only)
 */
router.get('/student', validatePagination, getStudentClasses);

/**
 * @route   GET /api/classes/:id
 * @desc    Get single class details
 * @access  Private (Teacher or enrolled student)
 */
router.get('/:id', validateObjectId('id'), getClassById);

/**
 * @route   PUT /api/classes/:id
 * @desc    Update class details
 * @access  Private (Teacher only)
 */
router.put('/:id', validateObjectId('id'), validateUpdateClass, updateClass);

/**
 * @route   DELETE /api/classes/:id
 * @desc    Delete class
 * @access  Private (Teacher only)
 */
router.delete('/:id', validateObjectId('id'), deleteClass);

/**
 * @route   POST /api/classes/:id/enroll
 * @desc    Enroll students in a class
 * @access  Private (Teacher only)
 */
router.post('/:id/enroll', 
  validateObjectId('id'), 
  validateEnrollStudents, 
  enrollStudents
);

/**
 * @route   DELETE /api/classes/:id/students/:studentId
 * @desc    Remove student from class
 * @access  Private (Teacher only)
 */
router.delete('/:id/students/:studentId', 
  validateObjectId('id'),
  validateObjectId('studentId'),
  removeStudent
);

module.exports = router;