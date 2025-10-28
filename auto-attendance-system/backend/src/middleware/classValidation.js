const { body, param, query } = require('express-validator');

/**
 * Validation middleware for class operations
 */

// Validation for creating a new class
const validateCreateClass = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Class name must be between 1 and 100 characters'),
    
  body('subject')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be between 1 and 100 characters'),
    
  body('schedule.dayOfWeek')
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day of week must be a valid day'),
    
  body('schedule.startTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
    
  body('schedule.endTime')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
    
  body('schedule.room')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Room cannot exceed 50 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

// Validation for updating a class
const validateUpdateClass = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Class name must be between 1 and 100 characters'),
    
  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Subject must be between 1 and 100 characters'),
    
  body('schedule.dayOfWeek')
    .optional()
    .isIn(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
    .withMessage('Day of week must be a valid day'),
    
  body('schedule.startTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Start time must be in HH:MM format'),
    
  body('schedule.endTime')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('End time must be in HH:MM format'),
    
  body('schedule.room')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Room cannot exceed 50 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
    
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Validation for enrolling students
const validateEnrollStudents = [
  body('studentEmails')
    .optional()
    .isArray()
    .withMessage('studentEmails must be an array'),
    
  body('studentEmails.*')
    .optional()
    .isEmail()
    .withMessage('Each email must be valid'),
    
  body('studentIds')
    .optional()
    .isArray()
    .withMessage('studentIds must be an array'),
    
  body('studentIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each student ID must be a valid MongoDB ObjectId'),
    
  // At least one of studentEmails or studentIds must be provided
  body()
    .custom((value) => {
      if ((!value.studentEmails || value.studentEmails.length === 0) && 
          (!value.studentIds || value.studentIds.length === 0)) {
        throw new Error('Either studentEmails or studentIds must be provided');
      }
      return true;
    })
];

// Validation for MongoDB ObjectId parameters
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`${paramName} must be a valid MongoDB ObjectId`)
];

// Validation for pagination
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  validateCreateClass,
  validateUpdateClass,
  validateEnrollStudents,
  validateObjectId,
  validatePagination
};