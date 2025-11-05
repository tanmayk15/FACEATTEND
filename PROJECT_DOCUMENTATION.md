# FACEATTEND — AI-Powered Automatic Attendance System

## AIM

Build a reliable, privacy-conscious, and scalable attendance system that uses face recognition to automatically mark student attendance from classroom photos uploaded by teachers. The goal is to eliminate manual roll calls, reduce errors, and provide a smooth experience for both teachers and students with real-time insights and auditability.

## THEORY

FACEATTEND uses a classic face-recognition pipeline backed by Deep Learning:

- Face Detection: MTCNN detects faces in classroom photos and returns bounding boxes and landmarks.
- Face Representation: Each detected face is converted into a 128‑dimensional embedding using the Facenet model via DeepFace (v0.0.95) running on TensorFlow.
- Similarity and Decision: For every detected face, cosine similarity is computed against stored student reference embeddings. If similarity exceeds a configurable threshold (default 0.6), the student is considered a match.
- Attendance Attribution: Recognized students are marked Present for that session with method=ai_recognition and a confidenceScore recorded. Non-recognized students can be marked later via manual processes (or remain unrecorded depending on policy).

Why this works:

- Embedding-based recognition (Facenet) is robust to small changes in pose, lighting, and expression, compared to raw pixel matching.
- Cosine similarity on normalized embeddings provides a stable metric to decide identity matches.

Key considerations and safeguards:

- Threshold Tuning: The 0.6 cosine threshold balances false negatives vs. false positives. It can be tightened for stricter matching or relaxed for recall.
- Multiple Embeddings: The system can store alternative embeddings to improve recognition coverage across varied conditions.
- Privacy: Only embeddings (numeric vectors) are stored, not raw biometric templates; access is role-protected and tokens are required.
- Auditability: Attendance records include method, confidenceScore, markedAt, and markedBy when applicable.

## TECH STACK

- Frontend (Port 3000)
	- React + Vite
	- axios, react-hot-toast, react-hook-form
	- Tailwind-style utility classes for UI

- Backend API (Port 5001)
	- Node.js, Express.js
	- MongoDB Atlas with Mongoose ODM
	- JWT authentication with access/refresh tokens
	- Role-based access control (teacher, student)
	- Nodemon for development reload

- AI Service (Port 8000)
	- Python, FastAPI, Uvicorn
	- DeepFace 0.0.95 (Facenet model), TensorFlow, MTCNN detector

- Infrastructure
	- Three services communicating over HTTP
	- MongoDB Atlas for persistent storage

## FEATURES

- Automatic Attendance via AI
	- Teachers upload a session photo; AI detects and recognizes students; Present records are created with method=ai_recognition and confidenceScore.

- Teacher Portal
	- Create classes, manage sessions, enroll students, upload photos to mark attendance automatically.

- Student Portal
	- Overview dashboard and stats
	- My Classes: Lists enrolled classes with attendance summaries
	- My Attendance: Select a class to view detailed, per-session attendance with status and confidence
	- Profile: View and edit profile (name, email, student ID)

- Registration with Face Enrollment
	- 2-step signup: form + live face capture
	- Student ID (roll number) is captured and validated as unique for students

- Security & Governance
	- JWT-protected APIs
	- Role-based endpoints
	- Audit fields on attendance (method, markedAt, markedBy, deviceInfo, location optional)

## WORKING

### System Overview

- Frontend (React) communicates with:
	- Backend API at /api (port 5001)
	- AI Service (port 8000) via backend orchestration
- MongoDB stores users, classes, sessions, and attendance records.

### Core Data Models (MongoDB via Mongoose)

- User
	- name, email (unique), password (hashed), role (teacher|student), isActive
	- studentId (unique sparse; required for students)
	- faceData: faceEmbedding (128-d vector) plus optional alternativeEmbeddings and reference photo metadata

- Class
	- name, subject, schedule (dayOfWeek, startTime, endTime, room)
	- teacher (User ref), students[] (User refs), description, isActive

- Session
	- class (Class ref), date, title, description
	- photoURL, photoMetadata, aiAnalysis, aiProcessed flags
	- attendance[] (Attendance refs), status (scheduled|active|completed|cancelled)

- Attendance
	- student (User ref), session (Session ref)
	- status (Present|Absent|Late|Excused)
	- method (manual|ai_recognition|qr_code|rfid), confidenceScore ∈ [0,1]
	- markedAt, markedBy, notes, optional device/location context
	- Unique per (student, session)

### Endpoints (selected)

- Auth
	- POST /api/auth/register — register user (students include studentId, faceEmbedding)
	- POST /api/auth/login — login and receive tokens
	- GET  /api/auth/me — current user
	- GET  /api/auth/profile — detailed profile (protected)
	- PUT  /api/auth/profile — update profile (protected)

- Classes
	- GET  /api/classes — teacher’s classes
	- POST /api/classes — create class
	- GET  /api/classes/student — current student’s enrolled classes
	- GET  /api/classes/:id — class details

- Attendance
	- GET  /api/attendance/session/:sessionId — session attendance
	- GET  /api/attendance/my-attendance/:classId — current student’s records for a class
	- POST /api/attendance/mark — mark a single record
	- POST /api/attendance/bulk-mark — teacher bulk marking

### Key Flows

1) Registration (with face)
	 - Step 1: User enters name, email, role, password; students also enter unique studentId.
	 - Step 2: Face capture produces a 128-d embedding; frontend submits form + faceEmbedding to backend.
	 - Backend stores user (with studentId for students) and faceData if provided.

2) Teacher: Photo Upload → Automatic Attendance
	 - Teacher creates a session and uploads a classroom photo.
	 - Backend sends photo to AI service; AI detects faces, computes embeddings, and returns results.
	 - Backend matches embeddings to enrolled students’ reference embeddings.
	 - Recognized students get Attendance records with status=Present, method=ai_recognition, confidenceScore set; others can be handled manually.

3) Student Portal Views
	 - My Classes: GET /classes/student shows enrolled classes with total sessions and attendance rates.
	 - My Attendance: Select a class, then GET /attendance/my-attendance/:classId returns per-session records, with method and confidence.
	 - Profile: GET /auth/profile to load, PUT /auth/profile to edit name/email/studentId.

### Configuration & Defaults

- AI Threshold: Cosine similarity threshold defaults to 0.6.
- Ports: Frontend 3000, Backend 5001, AI 8000.
- Tokens: Access tokens + refresh token handling in backend.

### Reliability & Edge Cases

- Low-Confidence Matches: Below threshold → no auto-mark; teachers can override.
- Multiple Faces/Angles: Alternative embeddings can be stored to improve match coverage.
- Data Integrity: Unique index prevents duplicate attendance per (student, session). StudentID is unique among students.
- Enrollment Gate: Attendance creation validates the student is enrolled in the class.

## CONCLUSION

FACEATTEND delivers an end-to-end, AI-driven attendance solution: robust face recognition, secure role-based APIs, and streamlined UIs for teachers and students. The system already supports automatic recognition with confidence tracking, student self-service profiles (including unique student IDs), and clear attendance analytics.

Potential next steps:

- Liveness/anti-spoofing checks during face enrollment
- Batch photo processing and background queues
- Admin dashboards and CSV imports for enrollments
- Fine-grained threshold per class or per student
- On-device capture quality guidance to improve recognition rates

With these foundations, the platform is ready for production hardening and incremental feature growth.

