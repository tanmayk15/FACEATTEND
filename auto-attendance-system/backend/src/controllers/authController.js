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
      console.log('❌ Registration validation errors:', JSON.stringify(errors.array(), null, 2));
      console.log('📋 Request body:', JSON.stringify(req.body, null, 2));
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password, role, faceEmbedding, faceLocation, studentId } = req.body;

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        status: 'error',
        message: 'User with this email already exists'
      });
    }

    // Check if studentId is already taken (for students)
    if (role === 'student' && studentId) {
      const existingStudent = await User.findOne({ studentId: studentId.trim() });
      if (existingStudent) {
        return res.status(409).json({
          status: 'error',
          message: 'Student ID is already in use'
        });
      }
    }

    // Create new user with optional face data
    const userData = {
      name,
      email,
      password,
      role: role || 'student'
    };

    // Add studentId for students
    if (role === 'student' && studentId) {
      userData.studentId = studentId.trim();
    }

    // Add face data if provided
    if (faceEmbedding && Array.isArray(faceEmbedding) && faceEmbedding.length === 128) {
      userData.faceData = {
        faceEmbedding: faceEmbedding,
        isEnrolled: true,
        enrolledAt: new Date()
      };
      console.log('✅ Face data included in registration');
    }

    const user = new User(userData);

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

/**
 * Get all users (teachers can view students)
 * GET /api/auth/users?role=student
 */
const getAllUsers = async (req, res) => {
  try {
    const { role } = req.query;
    
    const filter = {};
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('name email studentId role faceData.faceEmbedding createdAt')
      .sort({ createdAt: -1 });

    // Transform to include face registration status
    const usersWithFaceStatus = users.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email,
      studentId: user.studentId,
      role: user.role,
      hasFace: user.faceData?.faceEmbedding?.length === 128,
      createdAt: user.createdAt
    }));

    res.json({
      success: true,
      data: usersWithFaceStatus
    });

  } catch (error) {
    console.error('❌ Get all users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
};

/**
 * Get user profile
 * GET /api/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password -refreshToken');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile'
    });
  }
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, studentId } = req.body;
    const userId = req.user.userId;

    // Validate inputs
    if (name && (name.trim().length < 2 || name.trim().length > 50)) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 50 characters'
      });
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await User.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: userId } 
      });
      
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'Email is already in use by another account'
        });
      }
    }

    // Check if studentId is already taken by another user
    if (studentId) {
      const existingStudent = await User.findOne({ 
        studentId: studentId.trim(), 
        _id: { $ne: userId } 
      });
      
      if (existingStudent) {
        return res.status(409).json({
          success: false,
          message: 'Student ID is already in use by another account'
        });
      }
    }

    // Build update object
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (email) updateData.email = email.toLowerCase();
    if (studentId !== undefined) updateData.studentId = studentId.trim();

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  refreshToken,
  logout,
  getAllUsers,
  getProfile,
  updateProfile
};