import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import ClassManager from './ClassManager';
import SessionManager from './SessionManager';
import AttendanceBoard from './AttendanceBoard';
import StudentFaceManager from './StudentFaceManager';
import AutomaticAttendance from './AutomaticAttendance';
import { 
  AcademicCapIcon, 
  CameraIcon, 
  ClipboardDocumentListIcon, 
  UserGroupIcon,
  FaceSmileIcon,
  ChartBarIcon,
  BoltIcon
} from '@heroicons/react/24/outline';

const DashboardTeacher = () => {
  const [activeTab, setActiveTab] = useState('classes');
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetchUserInfo();
  }, []);

  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.data);
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  };

  const tabs = [
    {
      id: 'classes',
      name: 'Class Management',
      icon: AcademicCapIcon,
      component: ClassManager,
      description: 'Create and manage your classes'
    },
    {
      id: 'sessions',
      name: 'Session Management',
      icon: CameraIcon,
      component: SessionManager,
      description: 'Create sessions and upload photos'
    },
    {
      id: 'attendance',
      name: 'Attendance Board',
      icon: ClipboardDocumentListIcon,
      component: AttendanceBoard,
      description: 'View and manage attendance records'
    },
    {
      id: 'faces',
      name: 'Student Faces',
      icon: FaceSmileIcon,
      component: StudentFaceManager,
      description: 'Manage student face recognition data'
    },
    {
      id: 'auto-attendance',
      name: 'Auto Attendance',
      icon: BoltIcon,
      component: AutomaticAttendance,
      description: 'Use AI to automatically mark attendance from photos'
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Teacher Dashboard</h1>
              {userInfo && (
                <p className="text-gray-600">Welcome back, {userInfo.name}</p>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-sm text-gray-600">
                <UserGroupIcon className="h-5 w-5 mr-1" />
                Role: Teacher
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-200`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Description */}
      <div className="bg-blue-50 border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <p className="text-blue-700 text-sm">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {ActiveComponent && <ActiveComponent />}
      </div>

      {/* Quick Stats Footer */}
      <div className="bg-white border-t border-gray-200 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                <AcademicCapIcon className="h-8 w-8 mx-auto mb-1" />
              </div>
              <p className="text-sm text-gray-600">Classes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                <CameraIcon className="h-8 w-8 mx-auto mb-1" />
              </div>
              <p className="text-sm text-gray-600">Sessions</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                <ClipboardDocumentListIcon className="h-8 w-8 mx-auto mb-1" />
              </div>
              <p className="text-sm text-gray-600">Attendance</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                <FaceSmileIcon className="h-8 w-8 mx-auto mb-1" />
              </div>
              <p className="text-sm text-gray-600">Face Recognition</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                <BoltIcon className="h-8 w-8 mx-auto mb-1" />
              </div>
              <p className="text-sm text-gray-600">Auto Attendance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardTeacher;