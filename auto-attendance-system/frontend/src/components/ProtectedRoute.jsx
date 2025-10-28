import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Protected Route Component
 * Handles authentication and role-based access control
 */

const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  allowedRoles = null,
  redirectTo = '/login' 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check role-based access if required
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Required role: <span className="font-semibold">{requiredRole}</span><br />
            Your role: <span className="font-semibold">{user?.role}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Check multiple allowed roles if specified
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Allowed roles: <span className="font-semibold">{allowedRoles.join(', ')}</span><br />
            Your role: <span className="font-semibold">{user?.role}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Render children if all checks pass
  return children;
};

/**
 * Teacher-only protected route
 */
export const TeacherRoute = ({ children, redirectTo = '/login' }) => {
  return (
    <ProtectedRoute requiredRole="teacher" redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Student-only protected route
 */
export const StudentRoute = ({ children, redirectTo = '/login' }) => {
  return (
    <ProtectedRoute requiredRole="student" redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
};

/**
 * Any authenticated user route
 */
export const AuthenticatedRoute = ({ children, redirectTo = '/login' }) => {
  return (
    <ProtectedRoute allowedRoles={['teacher', 'student']} redirectTo={redirectTo}>
      {children}
    </ProtectedRoute>
  );
};

export default ProtectedRoute;