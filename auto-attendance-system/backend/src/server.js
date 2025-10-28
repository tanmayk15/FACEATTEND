// Load environment variables first - CRITICAL for .env file loading
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('🔧 Environment loaded:');
console.log('   PORT:', process.env.PORT);
console.log('   BACKEND_PORT:', process.env.BACKEND_PORT);
console.log('   MONGO_URI:', process.env.MONGO_URI ? 'SET' : 'NOT SET');
console.log('   NODE_ENV:', process.env.NODE_ENV);

const app = require('./app');

// Get port from environment or default to 5001
const PORT = process.env.PORT || process.env.BACKEND_PORT || 5001;

// Start the server
const server = app.listen(PORT, () => {
  console.log('🚀 ================================');
  console.log(`🚀 Backend Server Running!`);
  console.log(`🚀 Port: ${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🚀 Health Check: http://localhost:${PORT}/api/health`);
  console.log(`🚀 Binding: 0.0.0.0:${PORT} (accessible from all interfaces)`);
  console.log('🚀 ================================');
});

// Graceful shutdown handling (disabled for development to prevent interruptions)
// Uncomment for production
/*
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
*/

// Development mode - keep server running
console.log('🔧 Development mode: Server will stay running until manually stopped');

module.exports = server;