const express = require('express');
const multer = require('multer');
const path = require('path');
const { body } = require('express-validator');
const { authMiddleware } = require('../middleware/authMiddleware');
const {
  uploadStudentReferencePhoto,
  getStudentFaceData,
  getClassStudentsFaceData,
  updateStudentFaceSettings
} = require('../controllers/studentFaceController');

const router = express.Router();

// Multer configuration for student reference photos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/students/');
  },
  filename: function (req, file, cb) {
    // Create unique filename: studentId-timestamp-originalname
    const ext = path.extname(file.originalname);
    const filename = `${req.params.studentId}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only image files
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

/**
 * @route   POST /api/students/:studentId/upload-face
 * @desc    Upload reference photo for student face recognition
 * @access  Private (Teacher or Student for own photo)
 */
router.post(
  '/:studentId/upload-face',
  authMiddleware,
  upload.single('photo'),
  [
    body('studentId').isMongoId().withMessage('Invalid student ID format')
  ],
  uploadStudentReferencePhoto
);

/**
 * @route   GET /api/students/:studentId/face-data
 * @desc    Get student face recognition data
 * @access  Private (Teacher or Student for own data)
 */
router.get(
  '/:studentId/face-data',
  authMiddleware,
  getStudentFaceData
);

/**
 * @route   PUT /api/students/:studentId/face-settings
 * @desc    Update student face recognition settings
 * @access  Private (Teacher only)
 */
router.put(
  '/:studentId/face-settings',
  authMiddleware,
  [
    body('enabled')
      .optional()
      .isBoolean()
      .withMessage('Enabled must be a boolean value'),
    body('threshold')
      .optional()
      .isFloat({ min: 0.1, max: 0.9 })
      .withMessage('Threshold must be a number between 0.1 and 0.9')
  ],
  updateStudentFaceSettings
);

module.exports = router;