import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AttendanceBoard = ({ sessionId: propSessionId }) => {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(propSessionId || '');
  const [attendanceData, setAttendanceData] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // all, present, absent
  const [showMarkModal, setShowMarkModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);

  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchAttendanceData(selectedSession);
    }
  }, [selectedSession]);

  const fetchSessions = async () => {
    try {
      const token = localStorage.getItem('token');
      // First get classes, then sessions for each class
      const classesResponse = await axios.get(`${API_BASE}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (classesResponse.data.success) {
        const allSessions = [];
        for (const cls of classesResponse.data.data) {
          try {
            const sessionsResponse = await axios.get(`${API_BASE}/sessions/class/${cls._id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (sessionsResponse.data.success) {
              allSessions.push(...sessionsResponse.data.data.map(session => ({
                ...session,
                className: cls.name,
                classSubject: cls.subject
              })));
            }
          } catch (error) {
            console.error(`Error fetching sessions for class ${cls.name}:`, error);
          }
        }
        setSessions(allSessions);
        
        if (!selectedSession && allSessions.length > 0) {
          setSelectedSession(allSessions[0]._id);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions');
    }
  };

  const fetchAttendanceData = async (sessionId) => {
    if (!sessionId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Fetch session details
      const sessionResponse = await axios.get(`${API_BASE}/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch attendance data
      const attendanceResponse = await axios.get(`${API_BASE}/attendance/session/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (sessionResponse.data.success) {
        setSessionInfo(sessionResponse.data.data);
      }

      if (attendanceResponse.data.success) {
        setAttendanceData(attendanceResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast.error('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (studentId, status) => {
    try {
      const token = localStorage.getItem('token');
      const data = {
        sessionId: selectedSession,
        studentId: studentId,
        status: status,
        method: 'manual'
      };

      const response = await axios.post(`${API_BASE}/attendance/mark`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success(`Attendance marked as ${status}`);
        fetchAttendanceData(selectedSession);
        setShowMarkModal(false);
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
      const message = error.response?.data?.message || 'Failed to mark attendance';
      toast.error(message);
    }
  };

  const exportToCSV = () => {
    if (!attendanceData.length) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Student Name', 'Student ID', 'Status', 'Marked At', 'Method'];
    const csvData = [
      headers,
      ...attendanceData.map(record => [
        record.student?.name || 'Unknown',
        record.student?.studentId || 'Unknown',
        record.status,
        new Date(record.markedAt).toLocaleString(),
        record.method || 'manual'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${sessionInfo?.title || 'session'}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Attendance data exported');
  };

  const getFilteredData = () => {
    if (filter === 'all') return attendanceData;
    return attendanceData.filter(record => record.status === filter);
  };

  const getStatusBadge = (status) => {
    const statusClasses = {
      'present': 'bg-green-100 text-green-800',
      'absent': 'bg-red-100 text-red-800',
      'late': 'bg-yellow-100 text-yellow-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getAttendanceStats = () => {
    const total = attendanceData.length;
    const present = attendanceData.filter(r => r.status === 'present').length;
    const absent = attendanceData.filter(r => r.status === 'absent').length;
    const late = attendanceData.filter(r => r.status === 'late').length;
    
    return { total, present, absent, late };
  };

  const stats = getAttendanceStats();
  const filteredData = getFilteredData();

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 space-y-4 lg:space-y-0">
        <h2 className="text-2xl font-bold text-gray-800">Attendance Board</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a session</option>
            {sessions.map((session) => (
              <option key={session._id} value={session._id}>
                {session.className} - {session.title} ({new Date(session.date).toLocaleDateString()})
              </option>
            ))}
          </select>
          
          <button
            onClick={exportToCSV}
            disabled={!attendanceData.length}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
          >
            Export CSV
          </button>
        </div>
      </div>

      {sessionInfo && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-lg mb-2">{sessionInfo.title}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium">Date:</span> {new Date(sessionInfo.date).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Total Students:</span> {stats.total}
            </div>
            <div>
              <span className="font-medium">Present:</span> <span className="text-green-600">{stats.present}</span>
            </div>
            <div>
              <span className="font-medium">Absent:</span> <span className="text-red-600">{stats.absent}</span>
            </div>
          </div>
          
          {/* Attendance Rate Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-sm mb-1">
              <span>Attendance Rate</span>
              <span>{stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${stats.total > 0 ? (stats.present / stats.total) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : !selectedSession ? (
        <div className="text-center py-8">
          <p className="text-gray-500">Please select a session to view attendance</p>
        </div>
      ) : (
        <>
          {/* Filter Tabs */}
          <div className="flex space-x-1 mb-4">
            {['all', 'present', 'absent', 'late'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)} 
                {filterOption === 'all' && ` (${stats.total})`}
                {filterOption === 'present' && ` (${stats.present})`}
                {filterOption === 'absent' && ` (${stats.absent})`}
                {filterOption === 'late' && ` (${stats.late})`}
              </button>
            ))}
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No attendance records found for this filter</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Marked At
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {record.student?.name || 'Unknown Student'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {record.student?.studentId || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(record.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(record.markedAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          record.method === 'ai' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {record.method || 'manual'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedStudent(record);
                            setShowMarkModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Mark Attendance Modal */}
      {showMarkModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              Update Attendance for {selectedStudent.student?.name}
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => handleMarkAttendance(selectedStudent.student._id, 'present')}
                className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
              >
                Mark Present
              </button>
              
              <button
                onClick={() => handleMarkAttendance(selectedStudent.student._id, 'absent')}
                className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
              >
                Mark Absent
              </button>
              
              <button
                onClick={() => handleMarkAttendance(selectedStudent.student._id, 'late')}
                className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
              >
                Mark Late
              </button>
              
              <button
                onClick={() => {
                  setShowMarkModal(false);
                  setSelectedStudent(null);
                }}
                className="w-full bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceBoard;