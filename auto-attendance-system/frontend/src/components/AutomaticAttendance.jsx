import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  BoltIcon, 
  PhotoIcon, 
  UserGroupIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

const AutomaticAttendance = () => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [sessionDetails, setSessionDetails] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [threshold, setThreshold] = useState(0.7);
  const [markAbsentAfterAnalysis, setMarkAbsentAfterAnalysis] = useState(false);
  const [aiServiceStatus, setAiServiceStatus] = useState('unknown');

  useEffect(() => {
    fetchClasses();
    checkAIServiceStatus();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassSessions();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSession) {
      fetchSessionDetails();
    }
  }, [selectedSession]);

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

  const fetchClassSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/class/${selectedClass}?status=active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        // Filter sessions that have photos uploaded
        const sessionsWithPhotos = (data.data || []).filter(session => session.photoURL);
        setSessions(sessionsWithPhotos);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    }
  };

  const fetchSessionDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${selectedSession}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data.data);
      }
    } catch (error) {
      console.error('Error fetching session details:', error);
      toast.error('Failed to load session details');
    }
  };

  const checkAIServiceStatus = async () => {
    try {
      const response = await fetch('http://localhost:8000/health');
      if (response.ok) {
        const data = await response.json();
        setAiServiceStatus(data.status === 'ok' ? 'connected' : 'error');
      } else {
        setAiServiceStatus('error');
      }
    } catch (error) {
      setAiServiceStatus('disconnected');
    }
  };

  const runAutoAttendance = async () => {
    if (!selectedSession) {
      toast.error('Please select a session first');
      return;
    }

    if (aiServiceStatus !== 'connected') {
      toast.error('AI service is not available. Please check the connection.');
      return;
    }

    setProcessing(true);
    setAnalysisResults(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${selectedSession}/auto-attendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          threshold: threshold,
          markAbsentAfterAnalysis: markAbsentAfterAnalysis
        })
      });

      const data = await response.json();

      if (response.ok) {
        setAnalysisResults(data.data);
        toast.success('Automatic attendance analysis completed successfully!');
        
        // Refresh session details to show updated attendance
        fetchSessionDetails();
      } else {
        toast.error(data.message || 'Failed to run automatic attendance');
      }
    } catch (error) {
      console.error('Auto attendance error:', error);
      toast.error('Network error occurred');
    } finally {
      setProcessing(false);
    }
  };

  const getAutoAttendanceResults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/sessions/${selectedSession}/auto-attendance-results`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalysisResults(data.data);
      }
    } catch (error) {
      console.error('Error fetching auto attendance results:', error);
    }
  };

  const selectedClassData = classes.find(c => c._id === selectedClass);
  const selectedSessionData = sessions.find(s => s._id === selectedSession);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <BoltIcon className="h-8 w-8 text-yellow-600 mr-3" />
                Automatic Attendance
              </h2>
              <p className="text-gray-600 mt-1">Use AI face recognition to automatically mark student attendance</p>
            </div>
            
            {/* AI Service Status */}
            <div className="flex items-center space-x-2">
              <div className={`h-3 w-3 rounded-full ${
                aiServiceStatus === 'connected' ? 'bg-green-500 animate-pulse' : 
                aiServiceStatus === 'disconnected' ? 'bg-red-500' : 'bg-yellow-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                AI Service: {aiServiceStatus === 'connected' ? 'Connected' : 
                          aiServiceStatus === 'disconnected' ? 'Disconnected' : 'Checking...'}
              </span>
              <button
                onClick={checkAIServiceStatus}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left Column - Configuration */}
            <div className="space-y-6">
              {/* Class Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Class
                </label>
                <select
                  value={selectedClass}
                  onChange={(e) => {
                    setSelectedClass(e.target.value);
                    setSelectedSession('');
                    setSessionDetails(null);
                    setAnalysisResults(null);
                  }}
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

              {/* Session Selection */}
              {selectedClass && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Session with Photo
                  </label>
                  <select
                    value={selectedSession}
                    onChange={(e) => {
                      setSelectedSession(e.target.value);
                      setAnalysisResults(null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose a session...</option>
                    {sessions.map(session => (
                      <option key={session._id} value={session._id}>
                        {session.title} - {new Date(session.date).toLocaleDateString()}
                        {session.aiAnalysis && ' ✨ (AI Analyzed)'}
                      </option>
                    ))}
                  </select>
                  
                  {sessions.length === 0 && selectedClass && (
                    <p className="text-sm text-yellow-600 mt-1">
                      No sessions with photos found. Please upload photos to sessions first.
                    </p>
                  )}
                </div>
              )}

              {/* Configuration Options */}
              {selectedSession && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <h3 className="font-medium text-gray-900">AI Recognition Settings</h3>
                  
                  {/* Recognition Threshold */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recognition Threshold: {threshold}
                    </label>
                    <input
                      type="range"
                      min="0.3"
                      max="0.9"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Less Strict (0.3)</span>
                      <span>More Strict (0.9)</span>
                    </div>
                  </div>

                  {/* Auto Mark Absent */}
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="markAbsent"
                      checked={markAbsentAfterAnalysis}
                      onChange={(e) => setMarkAbsentAfterAnalysis(e.target.checked)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <label htmlFor="markAbsent" className="text-sm font-medium text-gray-700">
                        Automatically mark unrecognized students as absent
                      </label>
                      <p className="text-xs text-gray-500">
                        Students not detected in the photo will be marked as absent automatically
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Preview */}
              {sessionDetails && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 mb-2">Session Details</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Class:</strong> {selectedClassData?.name}</p>
                    <p><strong>Session:</strong> {sessionDetails.title}</p>
                    <p><strong>Date:</strong> {new Date(sessionDetails.date).toLocaleDateString()}</p>
                    <p><strong>Status:</strong> {sessionDetails.status}</p>
                    {sessionDetails.photoURL && (
                      <p className="flex items-center">
                        <PhotoIcon className="h-4 w-4 mr-1" />
                        Photo uploaded
                      </p>
                    )}
                    {sessionDetails.aiAnalysis && (
                      <p className="flex items-center text-green-700">
                        <CpuChipIcon className="h-4 w-4 mr-1" />
                        AI Analysis completed
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              {selectedSession && sessionDetails && (
                <div className="flex space-x-3">
                  <button
                    onClick={runAutoAttendance}
                    disabled={processing || aiServiceStatus !== 'connected'}
                    className="flex-1 flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-md hover:from-blue-700 hover:to-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                  >
                    {processing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <BoltIcon className="h-5 w-5 mr-2" />
                        Run Auto Attendance
                      </>
                    )}
                  </button>
                  
                  {sessionDetails.aiAnalysis && (
                    <button
                      onClick={getAutoAttendanceResults}
                      className="px-4 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center"
                    >
                      <EyeIcon className="h-5 w-5 mr-2" />
                      View Results
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {/* Session Photo Preview */}
              {sessionDetails && sessionDetails.photoURL && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Photo
                  </label>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={sessionDetails.photoURL}
                      alt="Session"
                      className="w-full h-64 object-cover"
                    />
                    {sessionDetails.aiAnalysis && (
                      <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded-md text-xs flex items-center">
                        <CpuChipIcon className="h-3 w-3 mr-1" />
                        AI Analyzed
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {analysisResults && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Analysis Results
                  </label>
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-green-800">Recognized</p>
                          <p className="text-lg font-bold text-green-600">
                            {analysisResults.analysisResults?.studentsRecognized || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <UserGroupIcon className="h-5 w-5 text-blue-600 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">Total Faces</p>
                          <p className="text-lg font-bold text-blue-600">
                            {analysisResults.analysisResults?.totalFacesDetected || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Results */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <ChartBarIcon className="h-5 w-5 mr-2" />
                      Attendance Updates
                    </h4>
                    
                    <div className="text-sm text-gray-600 space-y-2">
                      <div className="flex justify-between">
                        <span>Records Created:</span>
                        <span className="font-medium">{analysisResults.attendanceUpdates?.created || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Records Updated:</span>
                        <span className="font-medium">{analysisResults.attendanceUpdates?.updated || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Manually Marked (Skipped):</span>
                        <span className="font-medium">{analysisResults.attendanceUpdates?.skipped || 0}</span>
                      </div>
                      {markAbsentAfterAnalysis && (
                        <div className="flex justify-between">
                          <span>Auto-marked Absent:</span>
                          <span className="font-medium">{analysisResults.attendanceUpdates?.markedAbsent || 0}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recognized Students */}
                  {analysisResults.recognitionResults && analysisResults.recognitionResults.length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-3">Recognized Students</h4>
                      <div className="space-y-2">
                        {analysisResults.recognitionResults.map((result, index) => (
                          <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                            <div>
                              <p className="font-medium text-gray-900">{result.studentName}</p>
                              <p className="text-sm text-gray-600">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
                            </div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <CheckCircleIcon className="h-3 w-3 mr-1" />
                              Present
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Processing Info */}
                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                    <p><strong>Analysis ID:</strong> {analysisResults.analysisResults?.analysisId}</p>
                    <p><strong>Threshold Used:</strong> {analysisResults.analysisResults?.thresholdUsed}</p>
                    <p><strong>Processed At:</strong> {new Date(analysisResults.processedAt).toLocaleString()}</p>
                  </div>
                </div>
              )}

              {/* Instructions */}
              {!analysisResults && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-900 mb-2">How it works</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• Select a class and session with an uploaded photo</li>
                    <li>• Adjust the recognition threshold (lower = more lenient)</li>
                    <li>• AI will detect faces and match them to enrolled students</li>
                    <li>• Attendance will be automatically marked for recognized students</li>
                    <li>• Manual attendance entries are preserved and not overwritten</li>
                    <li>• Optionally mark unrecognized students as absent</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutomaticAttendance;