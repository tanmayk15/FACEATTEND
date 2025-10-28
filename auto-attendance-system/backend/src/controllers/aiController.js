const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const User = require('../models/User');

/**
 * AI Service Controller
 * Handles AI-powered face recognition for attendance
 * This is a stub implementation for Phase 3
 * Will be replaced with actual AI service integration in Phase 4
 */

// @desc    Analyze uploaded photo for face recognition
// @route   POST /api/ai/analyze-photo
// @access  Private (Teacher only)
const analyzePhoto = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can use AI analysis'
      });
    }

    // Verify session exists and teacher owns it
    const session = await Session.findById(sessionId).populate({
      path: 'class',
      populate: { path: 'students', select: 'name email studentId' }
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
        message: 'You can only analyze photos for your own sessions'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    // MOCK AI ANALYSIS - Replace with actual AI service in Phase 4
    const mockAnalysisResults = generateMockAnalysisResults(session.class.students);

    // Update session with AI processing results
    session.aiProcessed = true;
    session.aiProcessingResults = {
      totalFacesDetected: mockAnalysisResults.totalFacesDetected,
      studentsRecognized: mockAnalysisResults.recognizedStudents.length,
      confidenceAverage: mockAnalysisResults.averageConfidence,
      processedAt: new Date()
    };

    // Update session photo if not already set
    if (!session.photoURL) {
      session.photoURL = `/uploads/ai-analysis/${req.file.filename}`;
      session.photoMetadata = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        uploadedAt: new Date()
      };
    }

    await session.save();

    // Update attendance records based on AI results
    const attendanceUpdates = [];
    
    for (const recognized of mockAnalysisResults.recognizedStudents) {
      try {
        const attendance = await Attendance.findOneAndUpdate(
          { student: recognized.studentId, session: sessionId },
          {
            status: 'Present',
            method: 'ai_recognition',
            confidenceScore: recognized.confidence,
            markedBy: req.user.id,
            markedAt: new Date(),
            faceDetectionData: recognized.faceData
          },
          { new: true, upsert: true }
        ).populate('student', 'name email studentId');

        attendanceUpdates.push(attendance);
      } catch (error) {
        console.error(`Error updating attendance for student ${recognized.studentId}:`, error);
      }
    }

    res.json({
      success: true,
      message: 'Photo analysis completed successfully',
      data: {
        analysisResults: mockAnalysisResults,
        attendanceUpdates,
        session: {
          id: session._id,
          aiProcessed: session.aiProcessed,
          aiProcessingResults: session.aiProcessingResults
        }
      }
    });

  } catch (error) {
    console.error('AI photo analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing photo',
      error: error.message
    });
  }
};

// @desc    Get AI processing status for a session
// @route   GET /api/ai/status/:sessionId
// @access  Private (Teacher only)
const getProcessingStatus = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can check AI processing status'
      });
    }

    const session = await Session.findById(req.params.sessionId)
      .populate('class', 'name teacher');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (session.class.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this session'
      });
    }

    res.json({
      success: true,
      message: 'AI processing status retrieved',
      data: {
        sessionId: session._id,
        aiProcessed: session.aiProcessed,
        aiProcessingResults: session.aiProcessingResults,
        photoURL: session.photoURL,
        hasPhoto: !!session.photoURL
      }
    });

  } catch (error) {
    console.error('Get AI processing status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving AI processing status',
      error: error.message
    });
  }
};

// @desc    Reprocess photo with AI (for corrections)
// @route   POST /api/ai/reprocess/:sessionId
// @access  Private (Teacher only)
const reprocessPhoto = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can reprocess photos'
      });
    }

    const session = await Session.findById(req.params.sessionId).populate({
      path: 'class',
      populate: { path: 'students', select: 'name email studentId' }
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
        message: 'Access denied to this session'
      });
    }

    if (!session.photoURL) {
      return res.status(400).json({
        success: false,
        message: 'No photo available for reprocessing'
      });
    }

    // MOCK AI REPROCESSING - Generate new results
    const mockAnalysisResults = generateMockAnalysisResults(session.class.students);

    // Update session
    session.aiProcessingResults = {
      ...session.aiProcessingResults,
      totalFacesDetected: mockAnalysisResults.totalFacesDetected,
      studentsRecognized: mockAnalysisResults.recognizedStudents.length,
      confidenceAverage: mockAnalysisResults.averageConfidence,
      processedAt: new Date(),
      reprocessed: true
    };

    await session.save();

    res.json({
      success: true,
      message: 'Photo reprocessed successfully',
      data: {
        analysisResults: mockAnalysisResults,
        aiProcessingResults: session.aiProcessingResults
      }
    });

  } catch (error) {
    console.error('AI photo reprocessing error:', error);
    res.status(500).json({
      success: false,
      message: 'Error reprocessing photo',
      error: error.message
    });
  }
};

/**
 * Generate mock AI analysis results for testing Phase 3
 * This simulates what the actual AI service will return in Phase 4
 */
function generateMockAnalysisResults(students) {
  const totalStudents = students.length;
  const recognitionRate = 0.75 + Math.random() * 0.2; // 75-95% recognition rate
  const numRecognized = Math.floor(totalStudents * recognitionRate);
  
  // Randomly select students to be "recognized"
  const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
  const recognizedStudents = shuffledStudents.slice(0, numRecognized).map(student => ({
    studentId: student._id,
    confidence: 0.6 + Math.random() * 0.4, // 60-100% confidence
    faceData: {
      boundingBox: {
        x: Math.floor(Math.random() * 200),
        y: Math.floor(Math.random() * 200),
        width: 100 + Math.floor(Math.random() * 50),
        height: 120 + Math.floor(Math.random() * 50)
      },
      landmarks: generateMockLandmarks(),
      embedding: Array.from({ length: 128 }, () => Math.random() * 2 - 1) // Mock face embedding
    }
  }));

  const averageConfidence = recognizedStudents.length > 0 ? 
    recognizedStudents.reduce((sum, s) => sum + s.confidence, 0) / recognizedStudents.length : 0;

  return {
    totalFacesDetected: numRecognized + Math.floor(Math.random() * 3), // Sometimes detect extra faces
    recognizedStudents,
    averageConfidence: Math.round(averageConfidence * 100) / 100,
    processingTime: Math.floor(Math.random() * 5000) + 1000, // 1-6 seconds
    modelVersion: 'mock-v1.0.0',
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate mock facial landmarks for testing
 */
function generateMockLandmarks() {
  return {
    leftEye: { x: Math.random() * 100, y: Math.random() * 100 },
    rightEye: { x: Math.random() * 100, y: Math.random() * 100 },
    nose: { x: Math.random() * 100, y: Math.random() * 100 },
    mouth: { x: Math.random() * 100, y: Math.random() * 100 },
    chin: { x: Math.random() * 100, y: Math.random() * 100 }
  };
}

module.exports = {
  analyzePhoto,
  getProcessingStatus,
  reprocessPhoto
};