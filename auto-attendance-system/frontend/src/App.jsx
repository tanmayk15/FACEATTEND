import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Context Providers
import { AuthProvider } from './context/AuthContext';

// Components
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardTeacher from './pages/DashboardTeacher';
import DashboardStudent from './pages/DashboardStudent';

/**
 * Main App Component with Routing Configuration
 * Handles authentication flow and role-based routing
 */

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          {/* Global Toast Notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: 'green',
                  secondary: 'black',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: 'red',
                  secondary: 'black',
                },
              },
            }}
          />

          {/* Application Routes */}
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Teacher Routes */}
            <Route
              path="/dashboard/teacher"
              element={
                <ProtectedRoute requiredRole="teacher">
                  <DashboardTeacher />
                </ProtectedRoute>
              }
            />

            {/* Protected Student Routes */}
            <Route
              path="/dashboard/student"
              element={
                <ProtectedRoute requiredRole="student">
                  <DashboardStudent />
                </ProtectedRoute>
              }
            />

            {/* Default Route - Redirect to Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch All Route - Redirect to Login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;