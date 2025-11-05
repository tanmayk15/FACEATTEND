import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { formatDate } from '../utils/dateTimeFormat';

const API_BASE = '/api';

const StudentProfile = ({ classes = [] }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSessions: 0,
    attendanceRate: 0,
    hasFaceRegistered: false
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    studentId: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      
      // Fetch user profile
      const profileResponse = await axios.get(`${API_BASE}/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (profileResponse.data.success) {
        const userData = profileResponse.data.data;
        setProfile(userData);
        
        // Initialize edit form with current values
        setEditForm({
          name: userData.name || '',
          email: userData.email || '',
          studentId: userData.studentId || ''
        });
        
        // Check if face is registered
        const hasFace = userData.faceData?.faceEmbedding?.length === 128;
        
        // Use classes passed as props instead of fetching
        const totalClasses = classes.length;
        
        setStats({
          totalClasses,
          totalSessions: 0, // Will be calculated from attendance
          attendanceRate: 0, // Will be calculated from attendance
          hasFaceRegistered: hasFace
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset form to original values
    setEditForm({
      name: profile?.name || '',
      email: profile?.email || '',
      studentId: profile?.studentId || ''
    });
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      const token = localStorage.getItem('accessToken');
      
      // Validate fields
      if (!editForm.name.trim() || editForm.name.length < 2) {
        toast.error('Name must be at least 2 characters');
        return;
      }
      
      if (!editForm.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        toast.error('Please enter a valid email address');
        return;
      }
      
      if (!editForm.studentId.trim() || editForm.studentId.length < 3) {
        toast.error('Student ID must be at least 3 characters');
        return;
      }
      
      const response = await axios.put(
        `${API_BASE}/auth/profile`,
        editForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setProfile(response.data.data);
        setIsEditing(false);
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      const errorMsg = error.response?.data?.message || 'Failed to update profile';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          {!isEditing ? (
            <button
              onClick={handleEditClick}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <span className="mr-2">✏️</span>
              Edit Profile
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={handleCancelEdit}
                disabled={saving}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="mr-2">💾</span>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
        
        <div className="flex items-start space-x-6">
          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold">
              {(isEditing ? editForm.name : user?.name)?.charAt(0).toUpperCase()}
            </div>
          </div>
          
          {/* Profile Info */}
          <div className="flex-1">
            {!isEditing ? (
              <>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{user?.name}</h3>
                <div className="space-y-2 text-gray-600">
                  <p className="flex items-center">
                    <span className="font-medium w-32">Email:</span>
                    <span>{user?.email}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-32">Student ID:</span>
                    <span>{profile?.studentId || 'N/A'}</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-32">Role:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Student</span>
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-32">Face Registered:</span>
                    {stats.hasFaceRegistered ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs flex items-center">
                        ✓ Registered
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Not Registered
                      </span>
                    )}
                  </p>
                  <p className="flex items-center">
                    <span className="font-medium w-32">Member Since:</span>
                    <span>{formatDate(profile?.createdAt)}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                {/* Edit Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={editForm.name}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your full name"
                  />
                </div>

                {/* Edit Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={editForm.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your email"
                  />
                </div>

                {/* Edit Student ID */}
                <div>
                  <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 mb-1">
                    Student ID / Roll Number
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    name="studentId"
                    value={editForm.studentId}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your student ID"
                  />
                </div>

                {/* Read-only fields */}
                <div className="pt-2 border-t border-gray-200">
                  <p className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="font-medium w-32">Role:</span>
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">Student</span>
                  </p>
                  <p className="flex items-center text-sm text-gray-600 mb-2">
                    <span className="font-medium w-32">Face Status:</span>
                    {stats.hasFaceRegistered ? (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">✓ Registered</span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Not Registered</span>
                    )}
                  </p>
                  <p className="flex items-center text-sm text-gray-600">
                    <span className="font-medium w-32">Member Since:</span>
                    <span>{formatDate(profile?.createdAt)}</span>
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Enrolled Classes</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalClasses}</p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Face Recognition</p>
              <p className="text-lg font-semibold text-gray-900">
                {stats.hasFaceRegistered ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <div className="text-4xl">{stats.hasFaceRegistered ? '✅' : '❌'}</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Account Status</p>
              <p className="text-lg font-semibold text-green-600">Active</p>
            </div>
            <div className="text-4xl">✓</div>
          </div>
        </div>
      </div>

      {/* Face Registration Info */}
      {!stats.hasFaceRegistered && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">⚠️</div>
            <div>
              <h4 className="text-sm font-medium text-yellow-800 mb-1">Face Not Registered</h4>
              <p className="text-sm text-yellow-700">
                Your face has not been registered yet. Please contact your teacher to register your face for automatic attendance marking through AI.
              </p>
            </div>
          </div>
        </div>
      )}

      {stats.hasFaceRegistered && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start">
            <div className="text-2xl mr-3">✅</div>
            <div>
              <h4 className="text-sm font-medium text-green-800 mb-1">AI Attendance Enabled</h4>
              <p className="text-sm text-green-700">
                Your face is registered! Your attendance will be automatically marked when your teacher uploads class photos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">About Attendance System</h3>
        <div className="space-y-3 text-sm text-gray-600">
          <p className="flex items-start">
            <span className="mr-2">•</span>
            <span>Your attendance is automatically marked when teachers upload session photos</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2">•</span>
            <span>Face recognition uses AI to identify you with high accuracy</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2">•</span>
            <span>You can view your attendance records in the "My Attendance" tab</span>
          </p>
          <p className="flex items-start">
            <span className="mr-2">•</span>
            <span>Your face data is encrypted and secure</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default React.memo(StudentProfile);
