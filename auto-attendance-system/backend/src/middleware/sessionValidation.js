const { body, param, query } = require('express-validator');

/**
 * Validation middleware for session operations
 */

// Validation for creating a new session
const validateCreateSession = [
  body('classId')
    .isMongoId()
    .withMessage('Class ID must be a valid MongoDB ObjectId'),
    
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Session title must be between 1 and 100 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Session description cannot exceed 500 characters'),
    
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date string')
];

// Validation for updating session status
const validateUpdateSessionStatus = [
  body('status')
    .isIn(['scheduled', 'active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: scheduled, active, completed, cancelled')
];

// Validation for session queries
const validateSessionQueries = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
    
  query('status')
    .optional()
    .isIn(['scheduled', 'active', 'completed', 'cancelled'])
    .withMessage('Status must be one of: scheduled, active, completed, cancelled')
];

// Validation for MongoDB ObjectId parameters
const validateSessionId = [
  param('id')
    .isMongoId()
    .withMessage('Session ID must be a valid MongoDB ObjectId')
];

const validateClassId = [
  param('classId')
    .isMongoId()
    .withMessage('Class ID must be a valid MongoDB ObjectId')
];

module.exports = {
  validateCreateSession,
  validateUpdateSessionStatus,
  validateSessionQueries,
  validateSessionId,
  validateClassId
};