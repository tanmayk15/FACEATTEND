const Session = require('../models/Session');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const FormData = require('form-data');

/**
 * Session Controller
 * Handles all session-related operations including AI service integration
 */

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Call AI service to analyze photo for faces
 * @param {string} filePath - Path to the uploaded photo
 * @returns {Object} AI analysis results
 */
const analyzePhotoWithAI = async (filePath) => {
  try {
    console.log(`🤖 Sending photo to AI service: ${filePath}`);
    
    // Create form data for multipart upload
    const formData = new FormData();
    const fileStream = await fs.readFile(filePath);
    formData.append('file', fileStream, {
      filename: path.basename(filePath),
      contentType: 'image/jpeg'
    });

    // Make request to AI service
    const response = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    console.log(`✅ AI service response: ${response.data.facesDetected} faces detected`);
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ AI service error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'AI service is not available',
        details: 'Please ensure the AI service is running on port 8000'
      };
    }

    if (error.response) {
      return {
        success: false,
        error: 'AI service returned an error',
        details: error.response.data?.detail || error.message
      };
    }

    return {
      success: false,
      error: 'Failed to communicate with AI service',
      details: error.message
    };
  }
};

// @desc    Create a new attendance session
// @route   POST /api/sessions
// @access  Private (Teacher only)
const createSession = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { classId, title, description, date } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can create sessions'
      });
    }

    // Verify class exists and teacher owns it
    const classDoc = await Class.findById(classId).populate('students');
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classDoc.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only create sessions for your own classes'
      });
    }

    // Check if session already exists for this class on this date
    const sessionDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(sessionDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sessionDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingSession = await Session.findOne({
      class: classId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'A session already exists for this class on this date'
      });
    }

    // Create new session
    const newSession = new Session({
      class: classId,
      title,
      description,
      date: sessionDate,
      status: 'active'
    });

    const savedSession = await newSession.save();

    // Create attendance records for all enrolled students (initially marked as Absent)
    const attendanceRecords = classDoc.students.map(student => ({
      student: student._id,
      session: savedSession._id,
      status: 'Absent',
      method: 'manual',
      markedBy: req.user.id
    }));

    const createdAttendance = await Attendance.insertMany(attendanceRecords);
    
    // Update session with attendance references
    savedSession.attendance = createdAttendance.map(a => a._id);
    await savedSession.save();

    // Populate the session for response
    await savedSession.populate([
      { path: 'class', select: 'name subject' },
      { 
        path: 'attendance', 
        populate: { 
          path: 'student', 
          select: 'name email studentId' 
        } 
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: savedSession
    });

  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating session',
      error: error.message
    });
  }
};

// @desc    Get sessions for a specific class
// @route   GET /api/sessions/class/:classId
// @access  Private (Teacher or enrolled student)
const getClassSessions = async (req, res) => {
  try {
    const { classId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Verify class exists and user has access
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    const isTeacher = req.user.role === 'teacher' && classDoc.teacher.toString() === req.user.id;
    const isEnrolledStudent = req.user.role === 'student' && 
      classDoc.students.includes(req.user.id);

    if (!isTeacher && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this class'
      });
    }

    // Build query
    let query = { class: classId };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { date: -1 },
      populate: [
        { path: 'class', select: 'name subject' }
      ]
    };

    // For students, also populate their attendance for each session
    if (req.user.role === 'student') {
      options.populate.push({
        path: 'attendance',
        match: { student: req.user.id },
        select: 'status markedAt method confidenceScore'
      });
    } else {
      // For teachers, get attendance summary
      options.populate.push({
        path: 'attendance',
        select: 'status student',
        populate: { path: 'student', select: 'name studentId' }
      });
    }

    const sessions = await Session.find(query)
      .populate(options.populate)
      .sort(options.sort)
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Session.countDocuments(query);

    // Add attendance statistics for each session
    const sessionsWithStats = sessions.map(session => {
      const sessionObj = session.toObject();
      
      if (req.user.role === 'teacher') {
        const totalStudents = sessionObj.attendance.length;
        const presentCount = sessionObj.attendance.filter(a => 
          ['Present', 'Late', 'Excused'].includes(a.status)
        ).length;
        const absentCount = totalStudents - presentCount;
        const attendanceRate = totalStudents > 0 ? 
          ((presentCount / totalStudents) * 100).toFixed(1) : 0;

        sessionObj.stats = {
          totalStudents,
          presentCount,
          absentCount,
          attendanceRate: parseFloat(attendanceRate)
        };
      }

      return sessionObj;
    });

    res.json({
      success: true,
      message: 'Sessions retrieved successfully',
      data: sessionsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalSessions: total,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Get class sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving sessions',
      error: error.message
    });
  }
};

// @desc    Get single session details
// @route   GET /api/sessions/:id
// @access  Private (Teacher or enrolled student)
const getSessionById = async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate('class')
      .populate({
        path: 'attendance',
        populate: { path: 'student', select: 'name email studentId' }
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check user access
    const isTeacher = req.user.role === 'teacher' && 
      session.class.teacher.toString() === req.user.id;
    const isEnrolledStudent = req.user.role === 'student' && 
      session.class.students.includes(req.user.id);

    if (!isTeacher && !isEnrolledStudent) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    // Filter attendance data based on user role
    let sessionData = session.toObject();
    
    if (req.user.role === 'student') {
      // Students only see their own attendance
      sessionData.attendance = sessionData.attendance.filter(
        a => a.student._id.toString() === req.user.id
      );
    }

    // Add session statistics
    const totalStudents = session.attendance.length;
    const presentCount = session.attendance.filter(a => 
      ['Present', 'Late', 'Excused'].includes(a.status)
    ).length;
    const absentCount = totalStudents - presentCount;
    const attendanceRate = totalStudents > 0 ? 
      ((presentCount / totalStudents) * 100).toFixed(1) : 0;

    sessionData.stats = {
      totalStudents,
      presentCount,
      absentCount,
      attendanceRate: parseFloat(attendanceRate)
    };

    res.json({
      success: true,
      message: 'Session details retrieved successfully',
      data: sessionData
    });

  } catch (error) {
    console.error('Get session by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving session details',
      error: error.message
    });
  }
};

// @desc    Update session status
// @route   PUT /api/sessions/:id/status
// @access  Private (Teacher only)
const updateSessionStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can update session status'
      });
    }

    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify teacher owns this session
    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own sessions'
      });
    }

    session.status = status;
    await session.save();

    res.json({
      success: true,
      message: 'Session status updated successfully',
      data: { id: session._id, status: session.status }
    });

  } catch (error) {
    console.error('Update session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating session status',
      error: error.message
    });
  }
};

// @desc    Upload photo for session and analyze with AI
// @route   POST /api/sessions/:id/photo
// @access  Private (Teacher only)
const uploadSessionPhoto = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can upload session photos'
      });
    }

    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify teacher owns this session
    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only upload photos for your own sessions'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    // Update session with photo information
    session.photoURL = `/uploads/sessions/${req.file.filename}`;
    session.photoMetadata = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date()
    };

    // Analyze photo with AI service
    console.log(`🔍 Analyzing photo with AI service...`);
    const aiAnalysis = await analyzePhotoWithAI(req.file.path);
    
    if (aiAnalysis.success) {
      // Store AI analysis results in session
      session.aiAnalysis = {
        facesDetected: aiAnalysis.data.facesDetected,
        embeddings: aiAnalysis.data.embeddings,
        faceLocations: aiAnalysis.data.faceLocations,
        processedAt: new Date(),
        aiServiceVersion: aiAnalysis.data.version,
        message: aiAnalysis.data.message
      };
      
      console.log(`✅ AI Analysis complete: ${aiAnalysis.data.facesDetected} faces detected`);
    } else {
      // Store error information but don't fail the upload
      session.aiAnalysis = {
        error: aiAnalysis.error,
        details: aiAnalysis.details,
        processedAt: new Date(),
        facesDetected: 0
      };
      
      console.log(`⚠️ AI Analysis failed: ${aiAnalysis.error}`);
    }

    await session.save();

    // Prepare response
    const response = {
      success: true,
      message: 'Photo uploaded successfully',
      data: {
        photoURL: session.photoURL,
        metadata: session.photoMetadata,
        aiAnalysis: {
          facesDetected: session.aiAnalysis.facesDetected || 0,
          processedSuccessfully: aiAnalysis.success,
          message: session.aiAnalysis.message || session.aiAnalysis.error
        }
      }
    };

    // Add warning if AI service failed
    if (!aiAnalysis.success) {
      response.warning = 'Photo uploaded but AI analysis failed. Manual attendance marking is still available.';
    }

    res.json(response);

  } catch (error) {
    console.error('Upload session photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
      error: error.message
    });
  }
};

// @desc    Delete session
// @route   DELETE /api/sessions/:id
// @access  Private (Teacher only)
const deleteSession = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can delete sessions'
      });
    }

    const session = await Session.findById(req.params.id).populate('class');
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Verify teacher owns this session
    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own sessions'
      });
    }

    // Delete associated attendance records
    await Attendance.deleteMany({ session: req.params.id });

    // Delete session photo if exists
    if (session.photoURL) {
      try {
        const photoPath = path.join(__dirname, '../../uploads/sessions', 
          session.photoMetadata.filename);
        await fs.unlink(photoPath);
      } catch (fileError) {
        console.log('Photo file deletion error:', fileError.message);
      }
    }

    // Delete session
    await Session.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });

  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting session',
      error: error.message
    });
  }
};

// @desc    Test AI service connectivity
// @route   GET /api/sessions/ai-service/health
// @access  Private (Teacher only)
const testAIService = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can test AI service'
      });
    }

    console.log('🔍 Testing AI service connectivity...');
    
    const response = await axios.get(`${AI_SERVICE_URL}/health`, {
      timeout: 5000
    });

    res.json({
      success: true,
      message: 'AI service is connected and healthy',
      data: {
        aiServiceUrl: AI_SERVICE_URL,
        aiServiceStatus: response.data,
        connectionTime: new Date()
      }
    });

  } catch (error) {
    console.error('❌ AI service health check failed:', error.message);
    
    res.status(503).json({
      success: false,
      message: 'AI service is not available',
      error: error.code === 'ECONNREFUSED' 
        ? 'AI service is not running' 
        : error.message,
      data: {
        aiServiceUrl: AI_SERVICE_URL,
        errorCode: error.code,
        checkedAt: new Date()
      }
    });
  }
};

// @desc    Test AI service connectivity with debug info
// @route   GET /api/sessions/ai-service/test
// @access  Private (Teacher only)
const testAIServiceDebug = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can test AI service'
      });
    }

    console.log('🔍 Testing AI service connectivity with debug info...');
    
    try {
      const response = await axios.get(`${AI_SERVICE_URL}/health`, {
        timeout: 5000
      });

      console.log('✅ AI service response:', response.data);

      res.json({
        success: true,
        message: 'AI service is connected and healthy',
        data: {
          aiServiceUrl: AI_SERVICE_URL,
          aiServiceStatus: response.data,
          connectionTime: new Date(),
          backendCanReachAI: true
        }
      });

    } catch (aiError) {
      console.error('❌ AI service connectivity failed:', aiError.message);
      
      res.json({
        success: false,
        message: 'AI service connectivity test failed',
        data: {
          aiServiceUrl: AI_SERVICE_URL,
          error: aiError.message,
          errorCode: aiError.code,
          backendCanReachAI: false,
          checkedAt: new Date()
        }
      });
    }

  } catch (error) {
    console.error('❌ Test endpoint error:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Test endpoint error',
      error: error.message
    });
  }
};

// @desc    Automatically analyze photo and mark attendance
// @route   POST /api/sessions/:id/auto-attendance
// @access  Private (Teacher only)
const analyzeAndMarkAttendance = async (req, res) => {
  try {
    const { id: sessionId } = req.params;
    const { threshold = 0.7, markAbsentAfterAnalysis = false } = req.body;

    // Find session and verify permissions
    const session = await Session.findById(sessionId)
      .populate({
        path: 'class',
        populate: {
          path: 'students',
          select: 'name email studentId faceData'
        }
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only analyze sessions from your own classes'
      });
    }

    if (!session.photoURL) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded for this session. Please upload a photo first.'
      });
    }

    console.log(`🤖 Starting automatic attendance analysis for session: ${session.title}`);

    // Prepare photo file path
    const photoPath = session.photoURL.startsWith('/') ? 
      session.photoURL.substring(1) : session.photoURL;
    const fullPhotoPath = path.join(process.cwd(), photoPath);

    // Check if photo file exists
    try {
      await fs.access(fullPhotoPath, fs.constants.F_OK);
    } catch (error) {
      return res.status(404).json({
        success: false,
        message: 'Session photo file not found',
        photoPath: fullPhotoPath
      });
    }

    // Analyze photo with AI service for classroom recognition
    try {
      const formData = new FormData();
      const fileStream = await fs.readFile(fullPhotoPath);
      formData.append('file', fileStream, {
        filename: path.basename(fullPhotoPath),
        contentType: 'image/jpeg'
      });
      formData.append('class_id', session.class._id.toString());
      formData.append('session_id', sessionId);
      formData.append('threshold', threshold.toString());

      console.log('📡 Sending classroom photo to AI service for analysis...');

      const aiResponse = await axios.post(`${AI_SERVICE_URL}/analyze`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Content-Type': 'multipart/form-data'
        },
        timeout: 60000 // 60 seconds for processing
      });

      const analysisResult = aiResponse.data;
      console.log(`✅ AI Analysis complete: ${analysisResult.recognized_faces?.length || 0} students recognized`);

      // Update session with AI analysis results
      session.aiAnalysis = {
        processedAt: new Date(),
        totalFacesDetected: analysisResult.total_detected || 0,
        recognizedStudents: analysisResult.recognized_faces?.length || 0,
        unknownFaces: analysisResult.unknown_faces || 0,
        analysisId: analysisResult.analysis_id,
        thresholdUsed: threshold,
        aiProcessingInfo: analysisResult.processing_info || {}
      };

      // Automatically mark attendance based on AI recognition
      const Attendance = require('../models/Attendance');
      const attendanceUpdates = [];
      const recognitionResults = [];

      // Process recognized faces
      if (analysisResult.recognized_faces && analysisResult.recognized_faces.length > 0) {
        for (const recognizedFace of analysisResult.recognized_faces) {
          try {
            // Find existing attendance record
            let attendanceRecord = await Attendance.findOne({
              session: sessionId,
              student: recognizedFace.student_id
            });

            const attendanceData = {
              status: 'Present',
              markedAt: new Date(),
              method: 'ai_face_recognition',
              confidenceScore: recognizedFace.confidence,
              aiRecognitionData: {
                faceLocation: recognizedFace.face_location,
                embeddingMatch: true,
                processingTimestamp: new Date()
              }
            };

            if (attendanceRecord) {
              // Update existing record only if not manually marked
              if (attendanceRecord.method !== 'manual') {
                Object.assign(attendanceRecord, attendanceData);
                await attendanceRecord.save();
                attendanceUpdates.push({
                  action: 'updated',
                  studentId: recognizedFace.student_id,
                  previousStatus: attendanceRecord.status
                });
              } else {
                attendanceUpdates.push({
                  action: 'skipped',
                  studentId: recognizedFace.student_id,
                  reason: 'manually_marked'
                });
              }
            } else {
              // Create new attendance record
              attendanceRecord = new Attendance({
                student: recognizedFace.student_id,
                session: sessionId,
                ...attendanceData
              });
              await attendanceRecord.save();
              attendanceUpdates.push({
                action: 'created',
                studentId: recognizedFace.student_id
              });
            }

            // Find student info for response
            const student = session.class.students.find(s => 
              s._id.toString() === recognizedFace.student_id
            );

            recognitionResults.push({
              studentId: recognizedFace.student_id,
              studentName: student ? student.name : 'Unknown',
              confidence: recognizedFace.confidence,
              status: 'Present',
              method: 'ai_face_recognition',
              faceLocation: recognizedFace.face_location
            });

          } catch (error) {
            console.error(`❌ Error updating attendance for student ${recognizedFace.student_id}:`, error);
          }
        }
      }

      // Optionally mark remaining students as absent
      if (markAbsentAfterAnalysis) {
        const recognizedStudentIds = analysisResult.recognized_faces?.map(f => f.student_id) || [];
        const allStudentIds = session.class.students.map(s => s._id.toString());
        const unrecognizedStudentIds = allStudentIds.filter(id => !recognizedStudentIds.includes(id));

        for (const studentId of unrecognizedStudentIds) {
          try {
            let attendanceRecord = await Attendance.findOne({
              session: sessionId,
              student: studentId
            });

            if (!attendanceRecord) {
              attendanceRecord = new Attendance({
                student: studentId,
                session: sessionId,
                status: 'Absent',
                markedAt: new Date(),
                method: 'ai_auto_absent',
                aiRecognitionData: {
                  faceDetected: false,
                  autoMarkedAbsent: true,
                  processingTimestamp: new Date()
                }
              });
              await attendanceRecord.save();
              attendanceUpdates.push({
                action: 'marked_absent',
                studentId: studentId
              });
            }
          } catch (error) {
            console.error(`❌ Error marking student ${studentId} as absent:`, error);
          }
        }
      }

      // Save session with analysis results
      await session.save();

      // Prepare response
      const response = {
        success: true,
        message: 'Automatic attendance analysis completed successfully',
        data: {
          sessionId: sessionId,
          sessionTitle: session.title,
          analysisResults: {
            totalFacesDetected: analysisResult.total_detected || 0,
            studentsRecognized: analysisResult.recognized_faces?.length || 0,
            unknownFaces: analysisResult.unknown_faces || 0,
            thresholdUsed: threshold,
            analysisId: analysisResult.analysis_id
          },
          attendanceUpdates: {
            totalUpdated: attendanceUpdates.length,
            created: attendanceUpdates.filter(u => u.action === 'created').length,
            updated: attendanceUpdates.filter(u => u.action === 'updated').length,
            skipped: attendanceUpdates.filter(u => u.action === 'skipped').length,
            markedAbsent: attendanceUpdates.filter(u => u.action === 'marked_absent').length,
            details: attendanceUpdates
          },
          recognitionResults,
          annotatedImageUrl: analysisResult.annotated_image_url,
          processedAt: new Date()
        }
      };

      console.log(`✅ Automatic attendance completed: ${attendanceUpdates.length} records processed`);
      res.json(response);

    } catch (aiError) {
      console.error('❌ AI service error during attendance analysis:', aiError.message);
      
      return res.status(500).json({
        success: false,
        message: 'AI service error during analysis',
        error: aiError.response?.data?.detail || aiError.message,
        aiServiceStatus: 'error'
      });
    }

  } catch (error) {
    console.error('❌ Automatic attendance analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during automatic attendance analysis',
      error: error.message
    });
  }
};

// @desc    Get automatic attendance analysis results
// @route   GET /api/sessions/:id/auto-attendance-results
// @access  Private (Teacher only)
const getAutoAttendanceResults = async (req, res) => {
  try {
    const { id: sessionId } = req.params;

    const session = await Session.findById(sessionId)
      .populate({
        path: 'class',
        select: 'name subject teacher'
      });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get attendance records with AI recognition data
    const Attendance = require('../models/Attendance');
    const attendanceRecords = await Attendance.find({ session: sessionId })
      .populate('student', 'name email studentId')
      .sort({ 'student.name': 1 });

    // Separate AI-marked vs manually marked
    const aiMarkedRecords = attendanceRecords.filter(record => 
      record.method && record.method.includes('ai')
    );
    
    const manuallyMarkedRecords = attendanceRecords.filter(record => 
      record.method === 'manual'
    );

    const response = {
      success: true,
      message: 'Auto attendance results retrieved successfully',
      data: {
        sessionId: sessionId,
        sessionTitle: session.title,
        className: session.class.name,
        aiAnalysis: session.aiAnalysis || null,
        attendanceSummary: {
          totalStudents: attendanceRecords.length,
          aiMarked: aiMarkedRecords.length,
          manuallyMarked: manuallyMarkedRecords.length,
          presentCount: attendanceRecords.filter(r => r.status === 'Present').length,
          absentCount: attendanceRecords.filter(r => r.status === 'Absent').length
        },
        attendanceRecords: attendanceRecords.map(record => ({
          studentId: record.student._id,
          studentName: record.student.name,
          studentEmail: record.student.email,
          status: record.status,
          markedAt: record.markedAt,
          method: record.method,
          confidenceScore: record.confidenceScore,
          aiRecognitionData: record.aiRecognitionData
        })),
        aiMarkedStudents: aiMarkedRecords.map(record => ({
          studentName: record.student.name,
          confidence: record.confidenceScore,
          faceLocation: record.aiRecognitionData?.faceLocation
        }))
      }
    };

    res.json(response);

  } catch (error) {
    console.error('Get auto attendance results error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving auto attendance results',
      error: error.message
    });
  }
};

module.exports = {
  createSession,
  getClassSessions,
  getSessionById,
  updateSessionStatus,
  uploadSessionPhoto,
  deleteSession,
  testAIService,
  testAIServiceDebug,
  analyzeAndMarkAttendance,
  getAutoAttendanceResults
};