import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ClassManager from '../components/ClassManager';
import SessionManager from '../components/SessionManager';
import AttendanceBoard from '../components/AttendanceBoard';

const DashboardTeacher = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'classes', label: 'Classes', icon: '📚' },
    { id: 'sessions', label: 'Sessions', icon: '🎯' },
    { id: 'attendance', label: 'Attendance', icon: '✅' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎓</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Auto Attendance System</h1>
                <p className="text-sm text-gray-600">Teacher Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="font-medium text-gray-700">{user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                  Teacher
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <nav className="flex space-x-1 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome back, {user?.name}! 👋
              </h2>
              <p className="text-gray-600 mb-4">
                Use the tabs above to manage your classes, sessions, and attendance records.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('classes')}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <p className="font-medium text-blue-900">Manage Classes</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('sessions')}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎯</div>
                    <p className="font-medium text-green-900">Create Session</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">✅</div>
                    <p className="font-medium text-purple-900">View Attendance</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">🎉 Frontend Complete!</h4>
              <p className="text-sm text-green-700">
                All major UI components are functional with real backend integration.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'classes' && <ClassManager />}
        {activeTab === 'sessions' && <SessionManager />}
        {activeTab === 'attendance' && <AttendanceBoard />}
      </div>
    </div>
  );
};

export default DashboardTeacher;
