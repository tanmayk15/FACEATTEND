const { body, param, query } = require('express-validator');

/**
 * Validation middleware for attendance operations
 */

// Validation for marking attendance
const validateMarkAttendance = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId'),
    
  body('studentId')
    .isMongoId()
    .withMessage('Student ID must be a valid MongoDB ObjectId'),
    
  body('status')
    .isIn(['Present', 'Absent', 'Late', 'Excused'])
    .withMessage('Status must be one of: Present, Absent, Late, Excused'),
    
  body('method')
    .optional()
    .isIn(['manual', 'ai_recognition', 'qr_code', 'rfid'])
    .withMessage('Method must be one of: manual, ai_recognition, qr_code, rfid'),
    
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters'),
    
  body('confidenceScore')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Confidence score must be between 0 and 1')
];

// Validation for bulk marking attendance
const validateBulkMarkAttendance = [
  body('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId'),
    
  body('attendanceData')
    .isArray({ min: 1 })
    .withMessage('Attendance data must be a non-empty array'),
    
  body('attendanceData.*.studentId')
    .isMongoId()
    .withMessage('Each student ID must be a valid MongoDB ObjectId'),
    
  body('attendanceData.*.status')
    .isIn(['Present', 'Absent', 'Late', 'Excused'])
    .withMessage('Each status must be one of: Present, Absent, Late, Excused'),
    
  body('attendanceData.*.notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

// Validation for attendance queries
const validateAttendanceQueries = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date string'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date string'),
    
  query('classId')
    .optional()
    .isMongoId()
    .withMessage('Class ID must be a valid MongoDB ObjectId'),
    
  query('format')
    .optional()
    .isIn(['json', 'csv'])
    .withMessage('Format must be either json or csv')
];

// Validation for MongoDB ObjectId parameters
const validateSessionId = [
  param('sessionId')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId')
];

const validateStudentId = [
  param('studentId')
    .isMongoId()
    .withMessage('Student ID must be a valid MongoDB ObjectId')
];

const validateClassId = [
  param('classId')
    .isMongoId()
    .withMessage('Class ID must be a valid MongoDB ObjectId')
];

// Custom validation to ensure date range is valid
const validateDateRange = [
  query()
    .custom((value) => {
      if (value.startDate && value.endDate) {
        const start = new Date(value.startDate);
        const end = new Date(value.endDate);
        if (start > end) {
          throw new Error('Start date must be before end date');
        }
      }
      return true;
    })
];

module.exports = {
  validateMarkAttendance,
  validateBulkMarkAttendance,
  validateAttendanceQueries,
  validateSessionId,
  validateStudentId,
  validateClassId,
  validateDateRange
};