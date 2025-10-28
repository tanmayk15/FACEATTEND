import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { CameraIcon, UserIcon, CheckCircleIcon, XCircleIcon, PhotoIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const StudentFaceManager = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [uploadMode, setUploadMode] = useState('file'); // 'file' or 'camera'
  const [uploading, setUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);
  const [aiServiceStatus, setAiServiceStatus] = useState('unknown');
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    fetchClasses();
    checkAIServiceStatus();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    }
  }, [selectedClass]);

  const fetchClasses = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/classes', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setClasses(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    }
  };

  const fetchClassStudents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/classes/${selectedClass}/students/face-data`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(data.data.students || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load class students');
    }
  };

  const checkAIServiceStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        setAiServiceStatus('connected');
      } else {
        setAiServiceStatus('error');
      }
    } catch (error) {
      setAiServiceStatus('disconnected');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select a valid image file');
        return;
      }

      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480 } 
      });
      videoRef.current.srcObject = stream;
      setCameraActive(true);
      setUploadMode('camera');
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast.error('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    
    canvas.toBlob((blob) => {
      const file = new File([blob], 'captured-photo.jpg', { type: 'image/jpeg' });
      setSelectedFile(file);
      setPhotoPreview(canvas.toDataURL());
      stopCamera();
      setUploadMode('file');
    });
  };

  const uploadStudentPhoto = async () => {
    if (!selectedStudent || !selectedFile) {
      toast.error('Please select a student and photo');
      return;
    }

    if (aiServiceStatus !== 'connected') {
      toast.error('AI service is not available. Please check the connection.');
      return;
    }

    setUploading(true);
    setProcessingResult(null);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', selectedFile);

      const response = await fetch(`/api/students/${selectedStudent}/upload-face`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        setProcessingResult({
          success: true,
          ...data.data
        });
        toast.success('Student face photo uploaded and processed successfully!');
        
        // Refresh student list to show updated status
        fetchClassStudents();
        
        // Clear form
        setSelectedFile(null);
        setPhotoPreview(null);
        setSelectedStudent('');
        
      } else {
        setProcessingResult({
          success: false,
          error: data.message || 'Upload failed'
        });
        toast.error(data.message || 'Failed to upload student photo');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setProcessingResult({
        success: false,
        error: 'Network error occurred'
      });
      toast.error('Network error occurred');
    } finally {
      setUploading(false);
    }
  };

  const clearForm = () => {
    setSelectedFile(null);
    setPhotoPreview(null);
    setProcessingResult(null);
    setSelectedStudent('');
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getStudentById = (studentId) => {
    return students.find(s => s.studentId === studentId);
  };

  const selectedStudentData = selectedStudent ? getStudentById(selectedStudent) : null;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <UserIcon className="h-8 w-8 text-blue-600 mr-3" />
                Student Face Management
              </h2>
              <p className="text-gray-600 mt-1">Upload and manage student reference photos for face recognition</p>
            </div>
            
            {/* AI Service Status */}
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                aiServiceStatus === 'connected' ? 'bg-green-500' : 
                aiServiceStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                AI Service: {aiServiceStatus === 'connected' ? 'Connected' : 
                          aiServiceStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Student Selection & Upload */}
            <div className="space-y-6">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Choose a class...</option>
                  {classes.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} - {cls.subject}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Selection */}
              {selectedClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Student
                  </label>
                  <select
                    value={selectedStudent}
                    onChange={(e) => setSelectedStudent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a student...</option>
                    {students.map(student => (
                      <option key={student.studentId} value={student.studentId}>
                        {student.name} - {student.email}
                        {student.hasFaceData && ' ✓'}
                      </option>
                    ))}
                  </select>
                  
                  {selectedStudentData && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{selectedStudentData.name}</p>
                          <p className="text-sm text-gray-600">{selectedStudentData.email}</p>
                        </div>
                        <div className="flex items-center">
                          {selectedStudentData.hasFaceData ? (
                            <span className="flex items-center text-green-600 text-sm">
                              <CheckCircleIcon className="h-4 w-4 mr-1" />
                              Face Data Available
                            </span>
                          ) : (
                            <span className="flex items-center text-yellow-600 text-sm">
                              <XCircleIcon className="h-4 w-4 mr-1" />
                              No Face Data
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Upload Method Selection */}
              {selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Photo Upload Method
                  </label>
                  <div className="flex space-x-4">
                    <button
                      onClick={() => setUploadMode('file')}
                      className={`flex items-center px-4 py-2 rounded-md border ${
                        uploadMode === 'file' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <PhotoIcon className="h-5 w-5 mr-2" />
                      Choose File
                    </button>
                    <button
                      onClick={startCamera}
                      className={`flex items-center px-4 py-2 rounded-md border ${
                        uploadMode === 'camera' 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 bg-white text-gray-700'
                      }`}
                    >
                      <CameraIcon className="h-5 w-5 mr-2" />
                      Use Camera
                    </button>
                  </div>
                </div>
              )}

              {/* File Upload */}
              {uploadMode === 'file' && selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Photo
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Supported formats: JPG, PNG, GIF. Max size: 5MB
                  </p>
                </div>
              )}

              {/* Camera View */}
              {uploadMode === 'camera' && selectedStudent && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Camera Capture
                  </label>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      className="w-full h-64 object-cover"
                      style={{ display: cameraActive ? 'block' : 'none' }}
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {!cameraActive && (
                      <div className="flex items-center justify-center h-64">
                        <button
                          onClick={startCamera}
                          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                          <CameraIcon className="h-5 w-5 mr-2" />
                          Start Camera
                        </button>
                      </div>
                    )}
                    
                    {cameraActive && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
                        <button
                          onClick={capturePhoto}
                          className="px-6 py-2 bg-white text-gray-900 rounded-full shadow-lg hover:bg-gray-100"
                        >
                          Capture Photo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && selectedStudent && (
                <div className="flex space-x-3">
                  <button
                    onClick={uploadStudentPhoto}
                    disabled={uploading || aiServiceStatus !== 'connected'}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="h-5 w-5 mr-2" />
                        Upload & Process
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={clearForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Right Column - Preview & Results */}
            <div className="space-y-6">
              {/* Photo Preview */}
              {photoPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Photo Preview
                  </label>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-64 object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Processing Result */}
              {processingResult && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Processing Result
                  </label>
                  <div className={`p-4 rounded-lg border ${
                    processingResult.success 
                      ? 'border-green-200 bg-green-50' 
                      : 'border-red-200 bg-red-50'
                  }`}>
                    <div className="flex items-start">
                      {processingResult.success ? (
                        <CheckIcon className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      ) : (
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                      )}
                      
                      <div className="flex-1">
                        {processingResult.success ? (
                          <div>
                            <p className="font-medium text-green-800">Face Photo Processed Successfully!</p>
                            <div className="mt-2 text-sm text-green-700">
                              <p>• Student: {processingResult.studentName}</p>
                              <p>• Face detected with high confidence</p>
                              <p>• Recognition enabled: {processingResult.recognitionEnabled ? 'Yes' : 'No'}</p>
                              {processingResult.alternativeEmbeddings > 0 && (
                                <p>• Alternative embeddings: {processingResult.alternativeEmbeddings}</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium text-red-800">Processing Failed</p>
                            <p className="mt-1 text-sm text-red-700">{processingResult.error}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!photoPreview && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Photo Guidelines</h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure the photo shows only one person's face clearly</li>
                    <li>• Good lighting with the face well-lit and visible</li>
                    <li>• Face should be looking towards the camera</li>
                    <li>• Avoid heavy shadows or reflections</li>
                    <li>• Remove any face coverings if possible</li>
                    <li>• Use high-resolution images for better accuracy</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Students Summary Table */}
        {selectedClass && students.length > 0 && (
          <div className="border-t border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Class Students Overview</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Face Data Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Recognition
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.studentId}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {student.hasFaceData ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Available
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Missing
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          student.recognitionEnabled 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {student.recognitionEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.uploadedAt 
                          ? new Date(student.uploadedAt).toLocaleDateString()
                          : 'Never'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentFaceManager;