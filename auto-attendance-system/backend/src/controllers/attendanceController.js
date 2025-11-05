const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Class = require('../models/Class');
const User = require('../models/User');
const { validationResult } = require('express-validator');

/**
 * Attendance Controller
 * Handles all attendance-related operations
 */

// @desc    Mark attendance for a student in a session
// @route   POST /api/attendance/mark
// @access  Private (Teacher or Student)
const markAttendance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { sessionId, studentId, status, method = 'manual', notes } = req.body;

    // Find session and verify access
    const session = await Session.findById(sessionId).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check user permissions
    const isTeacher = req.user.role === 'teacher' && 
      session.class.teacher.toString() === req.user.userId;
    const isStudentMarkingSelf = req.user.role === 'student' && 
      req.user.userId === studentId;

    if (!isTeacher && !isStudentMarkingSelf) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to mark attendance'
      });
    }

    // Verify student is enrolled in the class
    if (!session.class.students.includes(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is not enrolled in this class'
      });
    }

    // Find or create attendance record
    let attendance = await Attendance.findOne({
      student: studentId,
      session: sessionId
    });

    if (attendance) {
      // Update existing attendance
      const oldStatus = attendance.status;
      attendance.status = status;
      attendance.method = method;
      attendance.markedBy = req.user.userId;
      attendance.markedAt = new Date();
      if (notes) attendance.notes = notes;

      await attendance.save();

      // Log the change if status changed
      if (oldStatus !== status && req.user.role === 'teacher') {
        session.manualOverrides = session.manualOverrides || [];
        session.manualOverrides.push({
          student: studentId,
          originalStatus: oldStatus,
          newStatus: status,
          reason: notes || 'Manual update',
          changedBy: req.user.userId
        });
        await session.save();
      }
    } else {
      // Create new attendance record
      attendance = new Attendance({
        student: studentId,
        session: sessionId,
        status,
        method,
        markedBy: req.user.userId,
        notes
      });

      await attendance.save();

      // Add to session's attendance array
      session.attendance.push(attendance._id);
      await session.save();
    }

    // Populate for response
    await attendance.populate('student', 'name email studentId');

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: attendance
    });

  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
};

// @desc    Bulk mark attendance for multiple students
// @route   POST /api/attendance/bulk-mark
// @access  Private (Teacher only)
const bulkMarkAttendance = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { sessionId, attendanceData } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can bulk mark attendance'
      });
    }

    // Verify session and teacher ownership
    const session = await Session.findById(sessionId).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.class.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only mark attendance for your own sessions'
      });
    }

    const results = {
      updated: [],
      errors: []
    };

    // Process each attendance record
    for (const record of attendanceData) {
      try {
        const { studentId, status, notes } = record;

        // Verify student is enrolled
        if (!session.class.students.includes(studentId)) {
          results.errors.push({
            studentId,
            error: 'Student not enrolled in class'
          });
          continue;
        }

        // Update or create attendance
        const attendance = await Attendance.findOneAndUpdate(
          { student: studentId, session: sessionId },
          {
            status,
            method: 'manual',
            markedBy: req.user.userId,
            markedAt: new Date(),
            ...(notes && { notes })
          },
          { 
            new: true, 
            upsert: true,
            runValidators: true 
          }
        ).populate('student', 'name email studentId');

        results.updated.push(attendance);

      } catch (recordError) {
        results.errors.push({
          studentId: record.studentId,
          error: recordError.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk attendance update completed. ${results.updated.length} records updated, ${results.errors.length} errors`,
      data: results
    });

  } catch (error) {
    console.error('Bulk mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk attendance marking',
      error: error.message
    });
  }
};

// @desc    Get attendance for a specific session
// @route   GET /api/attendance/session/:sessionId
// @access  Private (Teacher or enrolled student)
const getSessionAttendance = async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Verify session exists and user has access
    const session = await Session.findById(sessionId).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const isTeacher = req.user.role === 'teacher' && 
      session.class.teacher.toString() === req.user.userId;
    const isEnrolledStudent = req.user.role === 'student' && 
      session.class.students.includes(req.user.userId);

    if (!isTeacher && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    // Build query based on user role
    let query = { session: sessionId };
    if (req.user.role === 'student') {
      query.student = req.user.userId;
    }

    const attendance = await Attendance.find(query)
      .populate('student', 'name email studentId')
      .populate('markedBy', 'name email')
      .sort({ 'student.name': 1 });

    // Calculate statistics
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'Present').length,
      absent: attendance.filter(a => a.status === 'Absent').length,
      late: attendance.filter(a => a.status === 'Late').length,
      excused: attendance.filter(a => a.status === 'Excused').length
    };

    stats.attendanceRate = stats.total > 0 ? 
      (((stats.present + stats.late + stats.excused) / stats.total) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      message: 'Session attendance retrieved successfully',
      data: {
        session: {
          id: session._id,
          title: session.title,
          date: session.date,
          class: session.class
        },
        attendance,
        stats
      }
    });

  } catch (error) {
    console.error('Get session attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving session attendance',
      error: error.message
    });
  }
};

// @desc    Get attendance history for a student
// @route   GET /api/attendance/student/:studentId
// @access  Private (Teacher, Student viewing own records)
const getStudentAttendance = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, classId, page = 1, limit = 20 } = req.query;

    // Check permissions
    const isTeacher = req.user.role === 'teacher';
    const isStudentViewingSelf = req.user.role === 'student' && req.user.userId === studentId;

    if (!isTeacher && !isStudentViewingSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to student attendance records'
      });
    }

    // Build query
    let query = { student: studentId };

    // Date range filter
    if (startDate || endDate) {
      const sessionQuery = {};
      if (startDate) sessionQuery.$gte = new Date(startDate);
      if (endDate) sessionQuery.$lte = new Date(endDate);
      
      const sessions = await Session.find({ date: sessionQuery });
      query.session = { $in: sessions.map(s => s._id) };
    }

    // Class filter
    if (classId) {
      const sessions = await Session.find({ class: classId });
      query.session = query.session ? 
        { $in: query.session.$in.filter(id => sessions.map(s => s._id.toString()).includes(id.toString())) } :
        { $in: sessions.map(s => s._id) };
    }

    // For teachers, verify they have access to the classes
    if (isTeacher) {
      const teacherClasses = await Class.find({ teacher: req.user.userId });
      const teacherSessionIds = [];
      
      for (const cls of teacherClasses) {
        const sessions = await Session.find({ class: cls._id });
        teacherSessionIds.push(...sessions.map(s => s._id));
      }

      if (query.session) {
        query.session.$in = query.session.$in.filter(id => 
          teacherSessionIds.map(sid => sid.toString()).includes(id.toString())
        );
      } else {
        query.session = { $in: teacherSessionIds };
      }
    }

    // Pagination
    const skip = (page - 1) * limit;

    const attendance = await Attendance.find(query)
      .populate({
        path: 'session',
        populate: { path: 'class', select: 'name subject' }
      })
      .populate('markedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Attendance.countDocuments(query);

    // Calculate summary statistics
    const summary = await Attendance.getStudentSummary(studentId, startDate, endDate);

    res.json({
      success: true,
      message: 'Student attendance history retrieved successfully',
      data: {
        attendance,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalRecords: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student attendance',
      error: error.message
    });
  }
};

// @desc    Get attendance summary for a class
// @route   GET /api/attendance/class/:classId/summary
// @access  Private (Teacher only)
const getClassAttendanceSummary = async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view class attendance summaries'
      });
    }

    // Verify teacher owns the class
    const classDoc = await Class.findById(classId).populate('students', 'name email studentId');
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only view summaries for your own classes'
      });
    }

    // Get sessions for this class
    let sessionQuery = { class: classId };
    if (startDate || endDate) {
      sessionQuery.date = {};
      if (startDate) sessionQuery.date.$gte = new Date(startDate);
      if (endDate) sessionQuery.date.$lte = new Date(endDate);
    }

    const sessions = await Session.find(sessionQuery).sort({ date: -1 });
    const sessionIds = sessions.map(s => s._id);

    // Get attendance summary for each student
    const studentSummaries = await Promise.all(
      classDoc.students.map(async (student) => {
        const studentAttendance = await Attendance.find({
          student: student._id,
          session: { $in: sessionIds }
        });

        const totalSessions = sessionIds.length;
        const attendedSessions = studentAttendance.filter(a => 
          ['Present', 'Late', 'Excused'].includes(a.status)
        ).length;
        const absentSessions = studentAttendance.filter(a => a.status === 'Absent').length;
        const attendanceRate = totalSessions > 0 ? 
          ((attendedSessions / totalSessions) * 100).toFixed(1) : 0;

        return {
          student: {
            id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId
          },
          totalSessions,
          attendedSessions,
          absentSessions,
          attendanceRate: parseFloat(attendanceRate),
          records: studentAttendance
        };
      })
    );

    // Calculate overall class statistics
    const overallStats = {
      totalStudents: classDoc.students.length,
      totalSessions: sessions.length,
      averageAttendanceRate: studentSummaries.length > 0 ? 
        (studentSummaries.reduce((sum, s) => sum + parseFloat(s.attendanceRate), 0) / studentSummaries.length).toFixed(1) : 0
    };

    res.json({
      success: true,
      message: 'Class attendance summary retrieved successfully',
      data: {
        class: {
          id: classDoc._id,
          name: classDoc.name,
          subject: classDoc.subject
        },
        overallStats,
        studentSummaries,
        sessions: sessions.map(s => ({
          id: s._id,
          title: s.title,
          date: s.date,
          status: s.status
        }))
      }
    });

  } catch (error) {
    console.error('Get class attendance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving class attendance summary',
      error: error.message
    });
  }
};

// @desc    Export attendance data
// @route   GET /api/attendance/export/:classId
// @access  Private (Teacher only)
const exportAttendanceData = async (req, res) => {
  try {
    const { classId } = req.params;
    const { format = 'json', startDate, endDate } = req.query;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can export attendance data'
      });
    }

    // Verify class ownership
    const classDoc = await Class.findById(classId).populate('students');
    if (!classDoc || classDoc.teacher.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Get sessions and attendance data
    let sessionQuery = { class: classId };
    if (startDate || endDate) {
      sessionQuery.date = {};
      if (startDate) sessionQuery.date.$gte = new Date(startDate);
      if (endDate) sessionQuery.date.$lte = new Date(endDate);
    }

    const sessions = await Session.find(sessionQuery).sort({ date: 1 });
    const attendance = await Attendance.find({
      session: { $in: sessions.map(s => s._id) }
    }).populate('student session');

    // Format data for export
    const exportData = {
      class: {
        name: classDoc.name,
        subject: classDoc.subject,
        totalStudents: classDoc.students.length
      },
      exportDate: new Date().toISOString(),
      dateRange: {
        start: startDate || sessions[0]?.date,
        end: endDate || sessions[sessions.length - 1]?.date
      },
      sessions: sessions.map(session => ({
        id: session._id,
        title: session.title,
        date: session.date,
        status: session.status
      })),
      attendance: attendance.map(record => ({
        sessionId: record.session._id,
        sessionTitle: record.session.title,
        sessionDate: record.session.date,
        studentId: record.student.studentId,
        studentName: record.student.name,
        studentEmail: record.student.email,
        status: record.status,
        markedAt: record.markedAt,
        method: record.method,
        notes: record.notes
      }))
    };

    // Set appropriate headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance_export.csv');
      
      // Convert to CSV format
      const csvHeaders = 'Session Date,Session Title,Student ID,Student Name,Status,Marked At,Method,Notes\n';
      const csvRows = exportData.attendance.map(record => 
        `${record.sessionDate},${record.sessionTitle},"${record.studentId}","${record.studentName}",${record.status},${record.markedAt},${record.method},"${record.notes || ''}"`
      ).join('\n');
      
      res.send(csvHeaders + csvRows);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.json({
        success: true,
        message: 'Attendance data exported successfully',
        data: exportData
      });
    }

  } catch (error) {
    console.error('Export attendance data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting attendance data',
      error: error.message
    });
  }
};

// @desc    Get student's own attendance records for a specific class
// @route   GET /api/attendance/my-attendance/:classId
// @access  Private (Student only)
const getMyAttendance = async (req, res) => {
  try {
    const { classId } = req.params;
    const studentId = req.user.userId;

    console.log('🔍 getMyAttendance called - ClassID:', classId, 'StudentID:', studentId);

    // Verify the class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify student is enrolled in this class
    if (!classDoc.students.includes(studentId)) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }

    // Get all sessions for this class
    const sessions = await Session.find({ class: classId }).sort({ date: -1 });
    const sessionIds = sessions.map(s => s._id);

    console.log('📚 Found', sessions.length, 'sessions for class');

    // Get attendance records for this student in these sessions
    const attendanceRecords = await Attendance.find({
      session: { $in: sessionIds },
      student: studentId
    })
    .populate({
      path: 'session',
      select: 'title date startTime endTime'
    })
    .sort({ date: -1 });

    console.log('✅ Found', attendanceRecords.length, 'attendance records');

    res.json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: attendanceRecords,
      count: attendanceRecords.length
    });

  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving attendance records',
      error: error.message
    });
  }
};

module.exports = {
  markAttendance,
  bulkMarkAttendance,
  getSessionAttendance,
  getStudentAttendance,
  getClassAttendanceSummary,
  exportAttendanceData,
  getMyAttendance
};