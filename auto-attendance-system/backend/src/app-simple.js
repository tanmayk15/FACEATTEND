const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Create Express application
const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - allow frontend and AI service communication
app.use(cors({
  origin: [
    'http://localhost:3000',  // Frontend
    'http://frontend:3000',   // Docker frontend
    'http://localhost:8000',  // AI Service
    'http://ai_service:8000'  // Docker AI service
  ],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check route - Phase 1 requirement (without MongoDB dependency)
app.get('/api/health', (req, res) => {
  const healthStatus = {
    status: 'ok',
    service: 'backend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: 'not_required_for_phase_1',
    port: process.env.BACKEND_PORT || 5000,
    phase: 'Phase 1 - Infrastructure Setup',
    mongodb_note: 'MongoDB connection will be tested in Phase 2'
  };
  
  console.log('🏥 Health check requested:', healthStatus);
  res.json(healthStatus);
});

// API routes prefix
app.use('/api', (req, res, next) => {
  console.log(`📡 API Request: ${req.method} ${req.path}`);
  next();
});

// Test route for Phase 1
app.get('/api/test', (req, res) => {
  res.json({
    message: 'Backend is working correctly!',
    phase: 'Phase 1 - Infrastructure Setup',
    services: {
      backend: 'running',
      frontend: 'http://localhost:3000',
      ai_service: 'http://localhost:8000'
    }
  });
});

// Catch-all route for undefined endpoints
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    service: 'backend'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    service: 'backend'
  });
});

module.exports = app;