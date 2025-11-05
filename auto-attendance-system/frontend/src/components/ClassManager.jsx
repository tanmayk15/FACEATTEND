import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ClassManager = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [availableStudents, setAvailableStudents] = useState([]);

  const [selectedStudents, setSelectedStudents] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    schedule: {
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      room: ''
    },
    description: ''
  });

  const API_BASE = 'http://localhost:5001/api';

  // Fetch classes on component mount
  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/classes`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setClasses(response.data.data);
        toast.success(`Loaded ${response.data.data.length} classes`);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingClass(null);
    setFormData({ 
      name: '', 
      subject: '', 
      schedule: {
        dayOfWeek: '',
        startTime: '',
        endTime: '',
        room: ''
      }, 
      description: '' 
    });
    setShowModal(true);
  };

  const handleEdit = (classItem) => {
    setEditingClass(classItem);
    setFormData({
      name: classItem.name,
      subject: classItem.subject,
      schedule: {
        dayOfWeek: classItem.schedule?.dayOfWeek || '',
        startTime: classItem.schedule?.startTime || '',
        endTime: classItem.schedule?.endTime || '',
        room: classItem.schedule?.room || ''
      },
      description: classItem.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('accessToken');
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      let response;
      if (editingClass) {
        // Update existing class
        response = await axios.put(
          `${API_BASE}/classes/${editingClass._id}`,
          formData,
          config
        );
        toast.success('Class updated successfully!');
      } else {
        // Create new class
        response = await axios.post(`${API_BASE}/classes`, formData, config);
        toast.success('Class created successfully!');
      }

      setShowModal(false);
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error saving class:', error);
      const message = error.response?.data?.message || 'Failed to save class';
      toast.error(message);
    }
  };

  const handleDelete = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete "${className}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(`${API_BASE}/classes/${classId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Class deleted successfully!');
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error deleting class:', error);
      const message = error.response?.data?.message || 'Failed to delete class';
      toast.error(message);
    }
  };

  const handleManageStudents = async (classItem) => {
    setSelectedClass(classItem);
    setShowStudentModal(true);
    
    // Fetch all available students
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(`${API_BASE}/auth/users?role=student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        // Filter out students already in the class
        const enrolledIds = classItem.students?.map(s => s._id || s) || [];
        const available = response.data.data.filter(
          student => !enrolledIds.includes(student._id)
        );
        setAvailableStudents(available);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const handleAddStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    try {
      const token = localStorage.getItem('accessToken');
      await axios.post(
        `${API_BASE}/classes/${selectedClass._id}/enroll`,
        { studentIds: selectedStudents },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success(`${selectedStudents.length} student(s) added successfully!`);
      setShowStudentModal(false);
      setSelectedStudents([]);
      fetchClasses(); // Refresh the list
    } catch (error) {
      console.error('Error adding students:', error);
      const message = error.response?.data?.message || 'Failed to add students';
      toast.error(message);
    }
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('schedule.')) {
      // Handle nested schedule object
      const scheduleField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        schedule: {
          ...prev.schedule,
          [scheduleField]: value
        }
      }));
    } else {
      // Handle regular fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Class Management</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          + Create New Class
        </button>
      </div>

      {classes.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No classes found. Create your first class!</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Students
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((classItem) => (
                <tr key={classItem._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {classItem.name}
                    </div>
                    {classItem.description && (
                      <div className="text-sm text-gray-500">
                        {classItem.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.schedule?.dayOfWeek && classItem.schedule?.startTime && classItem.schedule?.endTime 
                      ? `${classItem.schedule.dayOfWeek} ${classItem.schedule.startTime}-${classItem.schedule.endTime}${classItem.schedule.room ? ` (${classItem.schedule.room})` : ''}`
                      : classItem.schedule || 'Not set'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {classItem.students?.length || 0} enrolled
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleManageStudents(classItem)}
                      className="text-green-600 hover:text-green-900"
                    >
                      Manage Students
                    </button>
                    <button
                      onClick={() => handleEdit(classItem)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(classItem._id, classItem.name)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">
              {editingClass ? 'Edit Class' : 'Create New Class'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Computer Science 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Computer Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Day of Week</label>
                    <select
                      name="schedule.dayOfWeek"
                      value={formData.schedule.dayOfWeek}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Day</option>
                      <option value="Monday">Monday</option>
                      <option value="Tuesday">Tuesday</option>
                      <option value="Wednesday">Wednesday</option>
                      <option value="Thursday">Thursday</option>
                      <option value="Friday">Friday</option>
                      <option value="Saturday">Saturday</option>
                      <option value="Sunday">Sunday</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Room (Optional)</label>
                    <input
                      type="text"
                      name="schedule.room"
                      value={formData.schedule.room}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Room 101"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Start Time</label>
                    <input
                      type="time"
                      name="schedule.startTime"
                      value={formData.schedule.startTime}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">End Time</label>
                    <input
                      type="time"
                      name="schedule.endTime"
                      value={formData.schedule.endTime}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
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
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Management Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold mb-4">
                Manage Students - {selectedClass?.name}
              </h2>
              
              <div className="mb-4 p-3 bg-blue-50 rounded">
                <p className="text-sm text-blue-800">
                  Currently enrolled: <strong>{selectedClass?.students?.length || 0}</strong> students
                </p>
              </div>

              {availableStudents.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No students available to add</p>
                  <p className="text-sm text-gray-400 mt-2">
                    All registered students are already enrolled in this class
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Students to Add:
                    </label>
                    <div className="border rounded-lg max-h-64 overflow-y-auto">
                      {availableStudents.map(student => (
                        <div
                          key={student._id}
                          className="flex items-center p-3 hover:bg-gray-50 border-b last:border-b-0"
                        >
                          <input
                            type="checkbox"
                            checked={selectedStudents.includes(student._id)}
                            onChange={() => toggleStudentSelection(student._id)}
                            className="h-4 w-4 text-blue-600 rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{student.name}</div>
                            <div className="text-sm text-gray-500">
                              {student.email}
                              {student.studentId && ` • ${student.studentId}`}
                            </div>
                            {student.hasFace && (
                              <span className="text-xs text-green-600">✓ Face registered</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-4">
                    Selected: <strong>{selectedStudents.length}</strong> student(s)
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowStudentModal(false);
                    setSelectedStudents([]);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                {availableStudents.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAddStudents}
                    disabled={selectedStudents.length === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Add {selectedStudents.length > 0 ? `(${selectedStudents.length})` : ''} Students
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManager;
