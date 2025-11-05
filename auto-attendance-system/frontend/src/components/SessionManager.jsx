import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { formatDate, formatDateTime } from '../utils/dateTimeFormat';

const SessionManager = ({ classId }) => {
  const [sessions, setSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(classId || '');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [aiServiceStatus, setAiServiceStatus] = useState(null);
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [uploadData, setUploadData] = useState({
    photo: null,
    photoPreview: null
  });

  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchClasses();
    checkAIServiceStatus();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSessions(selectedClass);
    }
  }, [selectedClass]);

  const checkAIServiceStatus = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/sessions/ai-service/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setAiServiceStatus('healthy');
      }
    } catch (error) {
      console.log('AI service status check:', error.response?.data?.message || 'unavailable');
      setAiServiceStatus('unavailable');
    }
  };

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClasses(response.data.data);
        if (!selectedClass && response.data.data.length > 0) {
          setSelectedClass(response.data.data[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const fetchSessions = async (classId) => {
    if (!classId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/sessions/class/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSessions(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const sessionData = {
        ...formData,
        classId: selectedClass
      };

      const response = await axios.post(`${API_BASE}/sessions`, sessionData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success('Session created successfully!');
        setShowCreateModal(false);
        setFormData({
          classId: '',
          title: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
        fetchSessions(selectedClass);
      }
    } catch (error) {
      console.error('Error creating session:', error);
      const message = error.response?.data?.message || 'Failed to create session';
      toast.error(message);
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadData.photo || !selectedSession) {
      toast.error('Please select a photo and session');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('accessToken');
      const formDataUpload = new FormData();
      formDataUpload.append('photo', uploadData.photo); // Fixed: changed back to 'photo' to match backend

      toast.loading('Analyzing photo with AI...', { id: 'ai-analysis' });

      const response = await axios.post(
        `${API_BASE}/sessions/${selectedSession._id}/photo`, // Updated endpoint path
        formDataUpload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data.success) {
        const { aiAnalysis } = response.data.data;
        
        toast.dismiss('ai-analysis');
        
        if (aiAnalysis?.facesDetected > 0) {
          toast.success(
            `Photo uploaded! AI detected ${aiAnalysis.facesDetected} face(s)`,
            { duration: 4000 }
          );
        } else {
          toast.success('Photo uploaded successfully!');
        }

        // Show AI analysis results if available
        if (aiAnalysis && aiAnalysis.processedSuccessfully) {
          console.log('AI Analysis Results:', aiAnalysis);
        }

        setShowUploadModal(false);
        setUploadData({ photo: null, photoPreview: null });
        setSelectedSession(null);
        fetchSessions(selectedClass);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.dismiss('ai-analysis');
      const message = error.response?.data?.message || 'Failed to upload photo';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadData({
          photo: file,
          photoPreview: e.target.result
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const openUploadModal = (session) => {
    setSelectedSession(session);
    setShowUploadModal(true);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'active': 'bg-green-100 text-green-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-gray-800">Session Management</h2>
          
          {/* AI Service Status Indicator */}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              aiServiceStatus === 'healthy' ? 'bg-green-500' : 
              aiServiceStatus === 'unavailable' ? 'bg-red-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-xs text-gray-600">
              AI: {aiServiceStatus === 'healthy' ? 'Online' : 
                   aiServiceStatus === 'unavailable' ? 'Offline' : 'Checking...'}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a class</option>
            {classes.map((cls) => (
              <option key={cls._id} value={cls._id}>
                {cls.name} - {cls.subject}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!selectedClass}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            + Create Session
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !selectedClass ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a class to view sessions</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No sessions found for this class. Create your first session!</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-gray-900">{session.title}</h3>
                {getStatusBadge(session.status)}
              </div>
              
              <p className="text-sm text-gray-600 mb-2">
                {formatDate(session.date)}
              </p>
              
              {session.description && (
                <p className="text-sm text-gray-600 mb-3">
                  {session.description}
                </p>
              )}

              {session.photoUrl && (
                <div className="mb-3">
                  <img
                    src={session.photoUrl}
                    alt="Session"
                    className="w-full h-32 object-cover rounded-md"
                  />
                </div>
              )}

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => openUploadModal(session)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  {session.photoUrl ? 'Update Photo' : 'Upload Photo'}
                </button>
                
                <button
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                >
                  View Attendance
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Session</h3>
            
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Lecture 5 - Data Structures"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Optional description..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {showUploadModal && selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Upload Photo for "{selectedSession.title}"
            </h3>
            
            <form onSubmit={handlePhotoUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Photo *
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: JPG, PNG, GIF. Max size: 10MB
                </p>
              </div>

              {uploadData.photoPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preview
                  </label>
                  <img
                    src={uploadData.photoPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-md border"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadData({ photo: null, photoPreview: null });
                    setSelectedSession(null);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Upload Photo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionManager;
