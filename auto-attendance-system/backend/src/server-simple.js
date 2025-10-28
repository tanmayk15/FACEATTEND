const app = require('./app-simple');
require('dotenv').config();

// Get port from environment or default to 5001
const PORT = process.env.BACKEND_PORT || 5001;

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 ================================');
  console.log(`🚀 Backend Server Running (Phase 1)!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Test Endpoint: http://localhost:${PORT}/api/test`);
  console.log('🚀 MongoDB: Will be configured in Phase 2');
  console.log('🚀 ================================');
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('📴 Backend server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('📴 Backend server closed.');
    process.exit(0);
  });
});

module.exports = server;