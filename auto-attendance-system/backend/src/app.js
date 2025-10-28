const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/authRoutes');
const classRoutes = require('./routes/classRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const aiRoutes = require('./routes/aiRoutes');
const studentFaceRoutes = require('./routes/studentFaceRoutes');
const classFaceRoutes = require('./routes/classFaceRoutes');

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// Cookie parser middleware (for refresh tokens)
app.use(cookieParser());

// CORS configuration - allow frontend and AI service communication
app.use(cors({
  origin: [
    'http://localhost:3000',  // Frontend
    'http://frontend:3000',   // Docker frontend
    'http://localhost:8000',  // AI Service
    'http://ai_service:8000'  // Docker AI service
  ],
  credentials: true // Allow cookies to be sent
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB connection with error handling
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`📊 MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    console.log('⚠️  Backend will continue running without database for Phase 1 testing');
    // Don't exit the process, just log the error for Phase 1
  }
};

// Initialize database connection
connectDB();

// API routes prefix with request logging (BEFORE routes)
app.use('/api', (req, res, next) => {
  console.log(`📡 API Request: ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check route - Phase 1 requirement
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    port: process.env.BACKEND_PORT || 5001,
    phase: 'Phase 3 - Core Business Logic',
    features: {
      authentication: 'enabled',
      authorization: 'enabled',
      jwt_tokens: 'enabled',
      user_roles: ['teacher', 'student'],
      class_management: 'enabled',
      session_management: 'enabled',
      attendance_tracking: 'enabled',
      ai_integration: 'stub_enabled'
    }
  };
  
  console.log('🏥 Health check requested:', healthStatus);
  res.json(healthStatus);
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/students', studentFaceRoutes);

// Class-specific face data routes
app.use('/api/classes', classFaceRoutes);

// Test route for Phase 3
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working correctly!',
    phase: 'Phase 3 - Core Business Logic',
    services: {
      backend: 'running',
      frontend: 'http://localhost:3000',
      ai_service: 'http://localhost:8000 (stub)'
    },
    api_endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout'
      },
      classes: {
        create: 'POST /api/classes',
        list_teacher: 'GET /api/classes',
        list_student: 'GET /api/classes/student',
        get_details: 'GET /api/classes/:id',
        update: 'PUT /api/classes/:id',
        delete: 'DELETE /api/classes/:id',
        enroll_students: 'POST /api/classes/:id/enroll',
        remove_student: 'DELETE /api/classes/:id/students/:studentId'
      },
      sessions: {
        create: 'POST /api/sessions',
        list_by_class: 'GET /api/sessions/class/:classId',
        get_details: 'GET /api/sessions/:id',
        update_status: 'PUT /api/sessions/:id/status',
        upload_photo: 'POST /api/sessions/:id/photo',
        delete: 'DELETE /api/sessions/:id'
      },
      attendance: {
        mark: 'POST /api/attendance/mark',
        bulk_mark: 'POST /api/attendance/bulk-mark',
        session_attendance: 'GET /api/attendance/session/:sessionId',
        student_history: 'GET /api/attendance/student/:studentId',
        class_summary: 'GET /api/attendance/class/:classId/summary',
        export_data: 'GET /api/attendance/export/:classId'
      },
      ai: {
        analyze_photo: 'POST /api/ai/analyze-photo',
        get_status: 'GET /api/ai/status/:sessionId',
        reprocess: 'POST /api/ai/reprocess/:sessionId'
      }
    }
  });
});

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    service: 'backend',
    phase: 'Phase 3'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    service: 'backend'
  });
});

module.exports = app;