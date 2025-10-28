const User = require('../models/User');
const Class = require('../models/Class');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const axios = require('axios');
const FormData = require('form-data');

/**
 * Student Face Management Controller
 * Handles student reference photo uploads and face embedding management
 */

// AI Service Configuration
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

/**
 * Analyze student photo with AI service
 * @param {string} filePath - Path to the uploaded photo
 * @returns {Object} AI analysis results
 */
const analyzeStudentPhotoWithAI = async (filePath) => {
  try {
    console.log(`🤖 Analyzing student photo with AI service: ${filePath}`);
    
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
      timeout: 30000
    });

    console.log(`✅ Student photo AI analysis: ${response.data.facesDetected} face(s) detected`);
    return {
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Student photo AI analysis error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return {
        success: false,
        error: 'AI service is not available',
        details: 'Please ensure the AI service is running on port 8000'
      };
    }

    return {
      success: false,
      error: 'Failed to analyze student photo',
      details: error.message
    };
  }
};

// @desc    Upload reference photo for student
// @route   POST /api/students/:studentId/upload-face
// @access  Private (Teacher only, or student for own photo)
const uploadStudentReferencePhoto = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { studentId } = req.params;

    // Find student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Check permissions: teachers can upload for any student, students can only upload for themselves
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only upload their own reference photos'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo file uploaded'
      });
    }

    // Analyze photo with AI service
    console.log(`🔍 Processing reference photo for student: ${student.name}`);
    const aiAnalysis = await analyzeStudentPhotoWithAI(req.file.path);
    
    if (!aiAnalysis.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to process photo with AI service',
        error: aiAnalysis.error,
        details: aiAnalysis.details
      });
    }

    // Validate face detection results
    if (aiAnalysis.data.facesDetected === 0) {
      return res.status(400).json({
        success: false,
        message: 'No faces detected in the uploaded photo. Please upload a clear photo with your face visible.'
      });
    }

    if (aiAnalysis.data.facesDetected > 1) {
      return res.status(400).json({
        success: false,
        message: 'Multiple faces detected. Please upload a photo with only one person.'
      });
    }

    // Extract face embedding (first and only face)
    const faceEmbedding = aiAnalysis.data.embeddings[0];
    const faceLocation = aiAnalysis.data.faceLocations[0];

    // Update student with face data
    const photoURL = `/uploads/students/${req.file.filename}`;
    
    // If student already has face data, save the old embedding as an alternative
    if (student.faceData && student.faceData.faceEmbedding && student.faceData.faceEmbedding.length > 0) {
      if (!student.faceData.alternativeEmbeddings) {
        student.faceData.alternativeEmbeddings = [];
      }
      
      student.faceData.alternativeEmbeddings.push({
        embedding: student.faceData.faceEmbedding,
        confidence: 0.9, // Previous main embedding gets high confidence
        uploadedAt: student.faceData.referencePhoto.uploadedAt || new Date()
      });
    }

    // Initialize faceData if it doesn't exist
    if (!student.faceData) {
      student.faceData = {};
    }

    // Update main face embedding
    student.faceData.faceEmbedding = faceEmbedding;
    
    // Update reference photo metadata
    student.faceData.referencePhoto = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      photoURL: photoURL,
      uploadedAt: new Date(),
      processedAt: new Date(),
      aiAnalysisResults: {
        facesDetected: aiAnalysis.data.facesDetected,
        faceLocation: faceLocation,
        confidence: 0.95 // High confidence for main reference
      }
    };

    // Update recognition settings
    if (!student.faceData.recognitionSettings) {
      student.faceData.recognitionSettings = {
        enabled: true,
        threshold: 0.6,
        lastUpdated: new Date()
      };
    } else {
      student.faceData.recognitionSettings.lastUpdated = new Date();
    }

    await student.save();

    console.log(`✅ Face data updated for student: ${student.name}`);

    res.json({
      success: true,
      message: 'Reference photo uploaded and processed successfully',
      data: {
        studentId: student._id,
        studentName: student.name,
        photoURL: photoURL,
        faceDetected: true,
        confidence: 0.95,
        alternativeEmbeddings: student.faceData.alternativeEmbeddings?.length || 0,
        recognitionEnabled: student.faceData.recognitionSettings.enabled
      }
    });

  } catch (error) {
    console.error('Upload student reference photo error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading reference photo',
      error: error.message
    });
  }
};

// @desc    Get student face data
// @route   GET /api/students/:studentId/face-data
// @access  Private (Teacher only, or student for own data)
const getStudentFaceData = async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student
    const student = await User.findById(studentId).select('-password -refreshToken');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Check permissions
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own face data'
      });
    }

    // Prepare response data (exclude sensitive embedding data for students)
    const responseData = {
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      hasFaceData: !!(student.faceData && student.faceData.faceEmbedding),
      referencePhoto: student.faceData?.referencePhoto || null,
      recognitionSettings: student.faceData?.recognitionSettings || null,
      alternativeEmbeddingsCount: student.faceData?.alternativeEmbeddings?.length || 0
    };

    // Include embedding data only for teachers
    if (req.user.role === 'teacher') {
      responseData.faceEmbedding = student.faceData?.faceEmbedding || null;
      responseData.alternativeEmbeddings = student.faceData?.alternativeEmbeddings || [];
    }

    res.json({
      success: true,
      message: 'Student face data retrieved successfully',
      data: responseData
    });

  } catch (error) {
    console.error('Get student face data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving student face data',
      error: error.message
    });
  }
};

// @desc    Get all students in a class with face data status
// @route   GET /api/classes/:classId/students/face-data
// @access  Private (Teacher only)
const getClassStudentsFaceData = async (req, res) => {
  try {
    const { classId } = req.params;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can view class students face data'
      });
    }

    // Find class and verify teacher ownership
    const classDoc = await Class.findById(classId).populate({
      path: 'students',
      select: 'name email studentId faceData'
    });

    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classDoc.teacher.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only view students from your own classes'
      });
    }

    // Process student face data
    const studentsWithFaceData = classDoc.students.map(student => ({
      studentId: student._id,
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      hasFaceData: !!(student.faceData && student.faceData.faceEmbedding),
      referencePhotoURL: student.faceData?.referencePhoto?.photoURL || null,
      uploadedAt: student.faceData?.referencePhoto?.uploadedAt || null,
      recognitionEnabled: student.faceData?.recognitionSettings?.enabled || false,
      alternativeEmbeddingsCount: student.faceData?.alternativeEmbeddings?.length || 0,
      threshold: student.faceData?.recognitionSettings?.threshold || 0.6
    }));

    const summary = {
      totalStudents: studentsWithFaceData.length,
      studentsWithFaceData: studentsWithFaceData.filter(s => s.hasFaceData).length,
      studentsWithoutFaceData: studentsWithFaceData.filter(s => !s.hasFaceData).length,
      recognitionEnabledCount: studentsWithFaceData.filter(s => s.recognitionEnabled).length
    };

    res.json({
      success: true,
      message: 'Class students face data retrieved successfully',
      data: {
        classId: classDoc._id,
        className: classDoc.name,
        summary,
        students: studentsWithFaceData
      }
    });

  } catch (error) {
    console.error('Get class students face data error:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving class students face data',
      error: error.message
    });
  }
};

// @desc    Update student face recognition settings
// @route   PUT /api/students/:studentId/face-settings
// @access  Private (Teacher only)
const updateStudentFaceSettings = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { enabled, threshold } = req.body;

    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can update face recognition settings'
      });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    if (student.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'User is not a student'
      });
    }

    // Initialize faceData if it doesn't exist
    if (!student.faceData) {
      student.faceData = {};
    }

    if (!student.faceData.recognitionSettings) {
      student.faceData.recognitionSettings = {};
    }

    // Update settings
    if (typeof enabled === 'boolean') {
      student.faceData.recognitionSettings.enabled = enabled;
    }

    if (typeof threshold === 'number' && threshold >= 0.1 && threshold <= 0.9) {
      student.faceData.recognitionSettings.threshold = threshold;
    }

    student.faceData.recognitionSettings.lastUpdated = new Date();

    await student.save();

    res.json({
      success: true,
      message: 'Face recognition settings updated successfully',
      data: {
        studentId: student._id,
        settings: student.faceData.recognitionSettings
      }
    });

  } catch (error) {
    console.error('Update student face settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating face settings',
      error: error.message
    });
  }
};

module.exports = {
  uploadStudentReferencePhoto,
  getStudentFaceData,
  getClassStudentsFaceData,
  updateStudentFaceSettings
};