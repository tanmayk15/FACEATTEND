const jwt = require('jsonwebtoken');

// Try to use real User model, fall back to mock for testing
let User;
try {
  User = require('../models/User');
} catch (error) {
  User = require('../models/MockUser');
}

/**
 * Authentication Middleware for Auto Attendance System
 * Verifies JWT tokens and manages user authorization
 */

/**
 * Verify JWT and attach user to request
 * Middleware to protect routes requiring authentication
 */
const authMiddleware = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7); // Remove 'Bearer ' prefix
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access token is required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Access token has expired',
          code: 'TOKEN_EXPIRED'
        });
      } else if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid access token'
        });
      } else {
        throw error;
      }
    }

    // Check if user still exists and is active
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'User not found or account deactivated'
      });
    }

    // Attach user info to request object
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role
    };

    console.log(`🔐 Authenticated request from: ${decoded.email} (${decoded.role})`);
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Role-based authorization middleware
 * Restricts access based on user roles
 * @param {string[]} allowedRoles - Array of allowed roles
 * @returns {Function} Middleware function
 */
const roleMiddleware = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated (should be set by authMiddleware)
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        console.log(`🚫 Access denied for ${req.user.email}: role '${req.user.role}' not in ${allowedRoles}`);
        return res.status(403).json({
          status: 'error',
          message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
          userRole: req.user.role,
          requiredRoles: allowedRoles
        });
      }

      console.log(`✅ Role authorization passed for: ${req.user.email} (${req.user.role})`);
      next();

    } catch (error) {
      console.error('❌ Role middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (user && user.isActive) {
          req.user = {
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role
          };
        }
      } catch (error) {
        // Ignore token errors for optional auth
        console.log('Optional auth token invalid, continuing without user');
      }
    }

    next();

  } catch (error) {
    console.error('❌ Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Middleware to check if user owns the resource
 * Used for operations where users can only access their own data
 * @param {string} userIdField - Field name containing the user ID in req.params
 */
const ownershipMiddleware = (userIdField = 'userId') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          status: 'error',
          message: 'Authentication required'
        });
      }

      const resourceUserId = req.params[userIdField];
      
      // Teachers can access any resource, students can only access their own
      if (req.user.role === 'teacher' || req.user.userId === resourceUserId) {
        next();
      } else {
        console.log(`🚫 Ownership denied for ${req.user.email}: trying to access ${resourceUserId}`);
        return res.status(403).json({
          status: 'error',
          message: 'Access denied. You can only access your own resources.'
        });
      }

    } catch (error) {
      console.error('❌ Ownership middleware error:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error during ownership check'
      });
    }
  };
};

module.exports = {
  authMiddleware,
  roleMiddleware,
  optionalAuth,
  ownershipMiddleware
};