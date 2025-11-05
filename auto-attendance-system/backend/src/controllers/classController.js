const Class = require('../models/Class');
const User = require('../models/User');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const { validationResult } = require('express-validator');

/**
 * Class Controller
 * Handles all class-related operations
 */

// @desc    Create a new class
// @route   POST /api/classes
// @access  Private (Teacher only)
const createClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { name, subject, schedule, description } = req.body;

    // Verify user is a teacher
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can create classes'
      });
    }

    // Create new class
    const newClass = new Class({
      name,
      subject,
      schedule,
      description,
      teacher: req.user.userId // Changed from req.user.userId to req.user.userId
    });

    const savedClass = await newClass.save();
    await savedClass.populate('teacher', 'name email');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: savedClass
    });

  } catch (error) {
    console.error('Create class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class',
      error: error.message
    });
  }
};

// @desc    Get all classes for current teacher
// @route   GET /api/classes
// @access  Private (Teacher only)
const getTeacherClasses = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view their classes'
      });
    }

    const classes = await Class.find({ teacher: req.user.userId })
      .populate('students', 'name email studentId')
      .populate('teacher', 'name email')
      .sort({ createdAt: -1 });

    // Add session counts for each class
    const classesWithStats = await Promise.all(
      classes.map(async (classDoc) => {
        const sessionCount = await Session.countDocuments({ class: classDoc._id });
        const activeSessionCount = await Session.countDocuments({ 
          class: classDoc._id, 
          status: 'active' 
        });
        
        return {
          ...classDoc.toObject(),
          sessionCount,
          activeSessionCount
        };
      })
    );

    res.json({
      success: true,
      message: 'Classes retrieved successfully',
      data: classesWithStats,
      count: classesWithStats.length
    });

  } catch (error) {
    console.error('Get teacher classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving classes',
      error: error.message
    });
  }
};

// @desc    Get all classes for current student
// @route   GET /api/classes/student
// @access  Private (Student only)
const getStudentClasses = async (req, res) => {
  try {
    console.log('🔍 getStudentClasses called for user:', req.user.userId, 'Role:', req.user.role);
    
    if (req.user.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Only students can view their enrolled classes'
      });
    }

    const classes = await Class.find({ students: req.user.userId })
      .populate('teacher', 'name email')
      .populate('students', 'name email studentId')
      .sort({ 'schedule.dayOfWeek': 1, 'schedule.startTime': 1 });

    console.log('📚 Found', classes.length, 'classes for student');

    // Add attendance stats for each class
    const classesWithStats = await Promise.all(
      classes.map(async (classDoc) => {
        const sessions = await Session.find({ class: classDoc._id });
        const sessionIds = sessions.map(s => s._id);
        
        const attendanceRecords = await Attendance.find({
          session: { $in: sessionIds },
          student: req.user.userId
        });

        const totalSessions = sessions.length;
        const attendedSessions = attendanceRecords.filter(a => 
          ['Present', 'Late', 'Excused'].includes(a.status)
        ).length;
        
        const attendanceRate = totalSessions > 0 ? 
          ((attendedSessions / totalSessions) * 100).toFixed(1) : 0;

        return {
          ...classDoc.toObject(),
          totalSessions,
          attendedSessions,
          attendanceRate: parseFloat(attendanceRate)
        };
      })
    );

    console.log('✅ Sending', classesWithStats.length, 'classes with stats');

    res.json({
      success: true,
      message: 'Enrolled classes retrieved successfully',
      data: classesWithStats,
      count: classesWithStats.length
    });

  } catch (error) {
    console.error('Get student classes error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving enrolled classes',
      error: error.message
    });
  }
};

// @desc    Get single class details
// @route   GET /api/classes/:id
// @access  Private (Teacher or enrolled student)
const getClassById = async (req, res) => {
  try {
    const classDoc = await Class.findById(req.params.id)
      .populate('teacher', 'name email')
      .populate('students', 'name email studentId');

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Check if user has access to this class
    const isTeacher = req.user.role === 'teacher' && classDoc.teacher._id.toString() === req.user.userId;
    const isEnrolledStudent = req.user.role === 'student' && 
      classDoc.students.some(student => student._id.toString() === req.user.userId);

    if (!isTeacher && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Get sessions for this class
    const sessions = await Session.find({ class: classDoc._id })
      .populate('attendance')
      .sort({ date: -1 })
      .limit(10); // Recent sessions only

    // Calculate class statistics
    const totalSessions = await Session.countDocuments({ class: classDoc._id });
    const completedSessions = await Session.countDocuments({ 
      class: classDoc._id, 
      status: 'completed' 
    });

    const classWithStats = {
      ...classDoc.toObject(),
      totalSessions,
      completedSessions,
      recentSessions: sessions
    };

    res.json({
      success: true,
      message: 'Class details retrieved successfully',
      data: classWithStats
    });

  } catch (error) {
    console.error('Get class by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving class details',
      error: error.message
    });
  }
};

// @desc    Enroll students in a class
// @route   POST /api/classes/:id/enroll
// @access  Private (Teacher only)
const enrollStudents = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { studentEmails, studentIds } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can enroll students'
      });
    }

    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify teacher owns this class
    if (classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only enroll students in your own classes'
      });
    }

    let query = {};
    if (studentEmails && studentEmails.length > 0) {
      query.email = { $in: studentEmails };
    }
    if (studentIds && studentIds.length > 0) {
      query.$or = query.$or || [];
      query.$or.push({ _id: { $in: studentIds } });
      query.$or.push({ studentId: { $in: studentIds } });
    }

    // Find students to enroll
    const studentsToEnroll = await User.find({
      ...query,
      role: 'student'
    });

    if (studentsToEnroll.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid students found to enroll'
      });
    }

    // Check which students are already enrolled
    const newStudents = studentsToEnroll.filter(student => 
      !classDoc.students.includes(student._id)
    );

    if (newStudents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All specified students are already enrolled'
      });
    }

    // Add new students to class
    classDoc.students.push(...newStudents.map(s => s._id));
    await classDoc.save();

    // Populate the updated class
    await classDoc.populate('students', 'name email studentId');

    res.json({
      success: true,
      message: `${newStudents.length} student(s) enrolled successfully`,
      data: {
        class: classDoc,
        enrolledStudents: newStudents.map(s => ({
          id: s._id,
          name: s.name,
          email: s.email,
          studentId: s.studentId
        }))
      }
    });

  } catch (error) {
    console.error('Enroll students error:', error);
    res.status(500).json({
      success: false,
      message: 'Error enrolling students',
      error: error.message
    });
  }
};

// @desc    Remove student from class
// @route   DELETE /api/classes/:id/students/:studentId
// @access  Private (Teacher only)
const removeStudent = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can remove students'
      });
    }

    const { id: classId, studentId } = req.params;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify teacher owns this class
    if (classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove students from your own classes'
      });
    }

    // Check if student is enrolled
    if (!classDoc.students.includes(studentId)) {
      return res.status(404).json({
        success: false,
        message: 'Student is not enrolled in this class'
      });
    }

    // Remove student from class
    classDoc.students = classDoc.students.filter(
      student => student.toString() !== studentId
    );
    await classDoc.save();

    res.json({
      success: true,
      message: 'Student removed from class successfully'
    });

  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing student from class',
      error: error.message
    });
  }
};

// @desc    Update class details
// @route   PUT /api/classes/:id
// @access  Private (Teacher only)
const updateClass = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can update classes'
      });
    }

    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify teacher owns this class
    if (classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own classes'
      });
    }

    const { name, subject, schedule, description, isActive } = req.body;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        ...(name && { name }),
        ...(subject && { subject }),
        ...(schedule && { schedule }),
        ...(description !== undefined && { description }),
        ...(isActive !== undefined && { isActive })
      },
      { new: true, runValidators: true }
    ).populate('teacher', 'name email')
     .populate('students', 'name email studentId');

    res.json({
      success: true,
      message: 'Class updated successfully',
      data: updatedClass
    });

  } catch (error) {
    console.error('Update class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating class',
      error: error.message
    });
  }
};

// @desc    Delete class
// @route   DELETE /api/classes/:id
// @access  Private (Teacher only)
const deleteClass = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can delete classes'
      });
    }

    const classDoc = await Class.findById(req.params.id);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify teacher owns this class
    if (classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own classes'
      });
    }

    // Check if class has any sessions
    const sessionCount = await Session.countDocuments({ class: req.params.id });
    if (sessionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete class with existing sessions. Please delete sessions first or mark class as inactive.'
      });
    }

    await Class.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Delete class error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting class',
      error: error.message
    });
  }
};

module.exports = {
  createClass,
  getTeacherClasses,
  getStudentClasses,
  getClassById,
  enrollStudents,
  removeStudent,
  updateClass,
  deleteClass
};