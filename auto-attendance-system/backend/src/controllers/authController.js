const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

// Try to use real User model, fall back to mock for testing
let User;
try {
  User = require('../models/User');
  console.log('✅ Using MongoDB User model');
} catch (error) {
  console.log('⚠️  MongoDB not available, using mock user model for testing');
  User = require('../models/MockUser');
}

/**
 * Authentication Controller for Auto Attendance System
 * Handles user registration, login, token refresh, and logout
 */

/**
 * Generate JWT tokens
 * @param {Object} payload - Token payload
 * @returns {Object} - Access and refresh tokens
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(
    payload,
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.TOKEN_EXPIRY || '15m' }
  );

  const refreshToken = jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
  );

  return { accessToken, refreshToken };
};

/**
 * Register new user (teacher or student)
 * POST /api/auth/register
 */
const register = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const user = new User({
      name,
      email,
      password,
      role: role || 'student'
    });

    await user.save();

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    await user.updateLastLogin();

    console.log(`✅ User registered: ${user.email} (${user.role})`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        accessToken
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during registration'
    });
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        status: 'error',
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Store refresh token in user document
    user.refreshToken = refreshToken;
    await user.save();

    // Set refresh token as HTTP-only cookie
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    // Update last login
    await user.updateLastLogin();

    console.log(`✅ User logged in: ${user.email} (${user.role})`);

    res.json({
      status: 'success',
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        },
        accessToken
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during login'
    });
  }
};

/**
 * Get current user data
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    // User is already attached to req by auth middleware
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Refresh token not provided'
      });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Find user and verify refresh token
    const user = await User.findById(decoded.userId);
    if (!user || user.refreshToken !== refreshToken) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid refresh token'
      });
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Update refresh token in database
    user.refreshToken = tokens.refreshToken;
    await user.save();

    // Set new refresh token as HTTP-only cookie
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    console.log(`🔄 Token refreshed for user: ${user.email}`);

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: tokens.accessToken
      }
    });

  } catch (error) {
    console.error('❌ Token refresh error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during token refresh'
    });
  }
};

/**
 * Logout user
 * POST /api/auth/logout
 */
const logout = async (req, res) => {
  try {
    const { refreshToken } = req.cookies;

    if (refreshToken) {
      // Find user and clear refresh token
      const user = await User.findOne({ refreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
        console.log(`📤 User logged out: ${user.email}`);
      }
    }

    // Clear refresh token cookie
    res.clearCookie('refreshToken');

    res.json({
      status: 'success',
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('❌ Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during logout'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout
};