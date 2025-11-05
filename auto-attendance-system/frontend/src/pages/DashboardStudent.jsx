import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import StudentClassView from '../components/StudentClassView';
import StudentAttendanceView from '../components/StudentAttendanceView';
import StudentProfile from '../components/StudentProfile';

const API_BASE = '/api';

/**
 * Student Dashboard Component
 * Main dashboard for students with participation features
 */

const DashboardStudent = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // Fetch enrolled classes once when dashboard mounts
  useEffect(() => {
    let isMounted = true;
    
    const fetchEnrolledClasses = async () => {
      try {
        setClassesLoading(true);
        const token = localStorage.getItem('accessToken'); // Fixed: was 'token', should be 'accessToken'
        
        if (!token) {
          console.error('❌ No token found');
          return;
        }
        
        console.log('� Fetching classes...');
        
        const response = await axios.get(`${API_BASE}/classes/student`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('📥 Response received:', response.data);
        
        if (isMounted && response.data.success) {
          const classesData = response.data.data || [];
          console.log('✅ Setting classes:', classesData.length, 'classes');
          setEnrolledClasses(classesData);
        }
      } catch (error) {
        console.error('❌ Error fetching classes:', error);
        if (isMounted) {
          toast.error('Failed to load classes');
        }
      } finally {
        if (isMounted) {
          setClassesLoading(false);
        }
      }
    };
    
    fetchEnrolledClasses();
    
    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency - run once on mount

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'classes', label: 'My Classes', icon: '📚' },
    { id: 'attendance', label: 'My Attendance', icon: '✅' },
    { id: 'profile', label: 'Profile', icon: '👤' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="text-2xl mr-3">🎓</div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Auto Attendance System</h1>
                <p className="text-sm text-gray-600">Student Portal</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-sm">
                <span className="font-medium text-gray-700">{user?.name}</span>
                <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                  Student
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

      {/* Main Content */}
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
              <p className="text-gray-600 mb-6">
                Track your attendance and view your enrolled classes. Your attendance is automatically marked through AI when teachers upload session photos.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('classes')}
                  className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">📚</div>
                    <p className="font-medium text-blue-900">My Classes</p>
                    <p className="text-sm text-blue-700 mt-1">View enrolled classes</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('attendance')}
                  className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">✅</div>
                    <p className="font-medium text-green-900">My Attendance</p>
                    <p className="text-sm text-green-700 mt-1">Check attendance records</p>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveTab('profile')}
                  className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">👤</div>
                    <p className="font-medium text-purple-900">My Profile</p>
                    <p className="text-sm text-purple-700 mt-1">View profile details</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Feature Highlights */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📱 Student Features</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🤖</div>
                  <div>
                    <h4 className="font-medium text-gray-900">AI-Powered Attendance</h4>
                    <p className="text-sm text-gray-600">
                      Automatic attendance marking through facial recognition when your teacher uploads session photos.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">📊</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Real-time Tracking</h4>
                    <p className="text-sm text-gray-600">
                      Monitor your attendance percentage and records for all enrolled classes in real-time.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">🔒</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Secure & Private</h4>
                    <p className="text-sm text-gray-600">
                      Your face data is encrypted and only used for attendance verification purposes.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">📧</div>
                  <div>
                    <h4 className="font-medium text-gray-900">Notifications</h4>
                    <p className="text-sm text-gray-600">
                      Get notified when attendance is marked and receive reminders about upcoming classes.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-green-800 mb-2">✨ AI Attendance System Active!</h4>
              <p className="text-sm text-green-700">
                Your attendance is automatically recorded when teachers upload class photos. 
                Face registration is done during account creation. Check your profile for face registration status.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'classes' && <StudentClassView classes={enrolledClasses} loading={classesLoading} />}
        {activeTab === 'attendance' && <StudentAttendanceView classes={enrolledClasses} />}
        {activeTab === 'profile' && <StudentProfile classes={enrolledClasses} />}
      </div>
    </div>
  );
};

export default DashboardStudent;