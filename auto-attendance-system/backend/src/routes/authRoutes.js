const express = require('express');
const authController = require('../controllers/authController');
const { authMiddleware, roleMiddleware } = require('../middleware/authMiddleware');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

/**
 * Authentication Routes for Auto Attendance System
 * All routes are prefixed with /api/auth
 */

/**
 * POST /api/auth/register
 * Register a new user (teacher or student)
 * Public route
 */
router.post('/register', validateRegister, authController.register);

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 * Public route
 */
router.post('/login', validateLogin, authController.login);

/**
 * GET /api/auth/me
 * Get current authenticated user's data
 * Protected route - requires valid JWT
 */
router.get('/me', authMiddleware, authController.getMe);

/**
 * GET /api/auth/profile
 * Get detailed user profile information
 * Protected route - requires valid JWT
 */
router.get('/profile', authMiddleware, authController.getProfile);

/**
 * PUT /api/auth/profile
 * Update user profile information
 * Protected route - requires valid JWT
 */
router.put('/profile', authMiddleware, authController.updateProfile);

/**
 * GET /api/auth/users
 * Get all users (filtered by role if specified)
 * Protected route - requires teacher role
 */
router.get('/users', authMiddleware, roleMiddleware(['teacher']), authController.getAllUsers);

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * Public route (but requires refresh token in cookies)
 */
router.post('/refresh', authController.refreshToken);

/**
 * POST /api/auth/logout
 * Logout user and clear refresh token
 * Public route
 */
router.post('/logout', authController.logout);

/**
 * GET /api/auth/test-protected
 * Test route to verify authentication middleware
 * Protected route - requires valid JWT
 */
router.get('/test-protected', authMiddleware, (req, res) => {
  res.json({
    status: 'success',
    message: 'Access granted to protected route',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/auth/test-teacher
 * Test route for teacher-only access
 * Protected route - requires teacher role
 */
router.get('/test-teacher', authMiddleware, roleMiddleware(['teacher']), (req, res) => {
  res.json({
    status: 'success',
    message: 'Access granted to teacher-only route',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/auth/test-student
 * Test route for student-only access
 * Protected route - requires student role
 */
router.get('/test-student', authMiddleware, roleMiddleware(['student']), (req, res) => {
  res.json({
    status: 'success',
    message: 'Access granted to student-only route',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/auth/test-any
 * Test route for any authenticated user
 * Protected route - requires any valid role
 */
router.get('/test-any', authMiddleware, roleMiddleware(['teacher', 'student']), (req, res) => {
  res.json({
    status: 'success',
    message: 'Access granted to any authenticated user',
    user: req.user,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;