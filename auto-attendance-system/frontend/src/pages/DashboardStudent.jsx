import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Student Dashboard Component
 * Main dashboard for students with participation features
 */

const DashboardStudent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="text-2xl">🎓</div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">
                  Auto Attendance System
                </h1>
                <p className="text-sm text-gray-500">Student Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Student
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-md text-sm hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome back, {user?.name}! 📚
              </h2>
              <p className="text-gray-600 mb-6">
                Track your attendance, view your classes, and monitor your academic progress.
              </p>
              
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">5</div>
                  <div className="text-sm text-blue-800">Enrolled Classes</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">88%</div>
                  <div className="text-sm text-green-800">Attendance Rate</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">3</div>
                  <div className="text-sm text-yellow-800">Today's Classes</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">42</div>
                  <div className="text-sm text-purple-800">Total Sessions</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                📅 Today's Schedule
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="font-medium text-blue-900">CS101 - Database Systems</div>
                    <div className="text-sm text-blue-700">Prof. Sarah Johnson</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-blue-900">9:00 AM - 10:30 AM</div>
                    <div className="text-xs text-blue-600">Room A-201</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <div className="font-medium text-green-900">MATH201 - Advanced Calculus</div>
                    <div className="text-sm text-green-700">Prof. Michael Chen</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green-900">11:00 AM - 12:30 PM</div>
                    <div className="text-xs text-green-600">Room B-105</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                  <div>
                    <div className="font-medium text-purple-900">ENG301 - Technical Writing</div>
                    <div className="text-sm text-purple-700">Prof. Lisa Davis</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-purple-900">2:00 PM - 3:30 PM</div>
                    <div className="text-xs text-purple-600">Room C-302</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-6 sm:px-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Mark Attendance */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">✅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mark Attendance</h3>
                <p className="text-gray-600 mb-4">
                  Mark your attendance for active sessions using manual entry or face recognition.
                </p>
                <button className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition-colors">
                  Mark Present
                </button>
              </div>
            </div>

            {/* View Attendance History */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">📊</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Attendance History</h3>
                <p className="text-gray-600 mb-4">
                  View your attendance records, track your participation rate across all courses.
                </p>
                <button className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 transition-colors">
                  View History
                </button>
              </div>
            </div>

            {/* Face Recognition */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">🤖</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">AI Recognition</h3>
                <p className="text-gray-600 mb-4">
                  Use AI-powered face recognition for quick and seamless attendance marking.
                </p>
                <button className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 transition-colors">
                  Setup Face ID (Phase 4)
                </button>
              </div>
            </div>

            {/* Class Schedule */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">📅</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Class Schedule</h3>
                <p className="text-gray-600 mb-4">
                  View your complete class schedule, upcoming sessions, and important dates.
                </p>
                <button className="w-full bg-indigo-500 text-white py-2 px-4 rounded hover:bg-indigo-600 transition-colors">
                  View Schedule
                </button>
              </div>
            </div>

            {/* Notifications */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">🔔</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Notifications</h3>
                <p className="text-gray-600 mb-4">
                  Get notified about upcoming classes, attendance reminders, and announcements.
                </p>
                <button className="w-full bg-orange-500 text-white py-2 px-4 rounded hover:bg-orange-600 transition-colors">
                  View Notifications
                </button>
              </div>
            </div>

            {/* Profile Settings */}
            <div className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="text-3xl mb-4">👤</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Profile Settings</h3>
                <p className="text-gray-600 mb-4">
                  Update your profile information, change password, and manage preferences.
                </p>
                <button className="w-full bg-gray-500 text-white py-2 px-4 rounded hover:bg-gray-600 transition-colors">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                📈 Attendance Summary
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">CS101 - Database Systems</div>
                    <div className="text-sm text-gray-600">15 sessions attended / 16 total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">94%</div>
                    <div className="text-xs text-gray-500">Excellent</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">MATH201 - Advanced Calculus</div>
                    <div className="text-sm text-gray-600">12 sessions attended / 14 total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-yellow-600">86%</div>
                    <div className="text-xs text-gray-500">Good</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium text-gray-900">ENG301 - Technical Writing</div>
                    <div className="text-sm text-gray-600">10 sessions attended / 12 total</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-red-600">83%</div>
                    <div className="text-xs text-gray-500">Needs Improvement</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Recent Activity
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Attendance marked for CS101 - Database Systems
                  </span>
                  <span className="text-xs text-gray-400">1 hour ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    New assignment posted in MATH201
                  </span>
                  <span className="text-xs text-gray-400">3 hours ago</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    Reminder: ENG301 class tomorrow at 2:00 PM
                  </span>
                  <span className="text-xs text-gray-400">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Phase Status */}
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-green-800 mb-2">✨ Phase 2 Complete!</h4>
            <p className="text-sm text-green-700">
              You now have access to the student portal with role-based authentication. 
              Coming soon: Enhanced attendance features in Phase 3!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardStudent;