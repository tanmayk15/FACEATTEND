const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Class = require('../models/Class');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

/**
 * Seed Phase 3 data for testing
 * Creates classes, sessions, and attendance records
 */

const seedPhase3Data = async () => {
  try {
    console.log('🌱 Starting Phase 3 data seeding...');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Check if we have users from Phase 2
    const users = await User.find();
    console.log(`📊 Found ${users.length} existing users`);

    const teachers = users.filter(u => u.role === 'teacher');
    const students = users.filter(u => u.role === 'student');

    if (teachers.length === 0 || students.length === 0) {
      console.log('❌ No teachers or students found. Please run Phase 2 user seed first.');
      process.exit(1);
    }

    console.log(`👨‍🏫 Teachers: ${teachers.length}, 👨‍🎓 Students: ${students.length}`);

    // Create sample classes
    const sampleClasses = [
      {
        name: 'Database Systems',
        subject: 'Computer Science',
        schedule: {
          dayOfWeek: 'Monday',
          startTime: '09:00',
          endTime: '10:30',
          room: 'CS-101'
        },
        teacher: teachers[0]._id,
        description: 'Introduction to database design and SQL',
        students: students.slice(0, 3).map(s => s._id)
      },
      {
        name: 'Advanced Calculus',
        subject: 'Mathematics',
        schedule: {
          dayOfWeek: 'Tuesday',
          startTime: '11:00',
          endTime: '12:30',
          room: 'MATH-205'
        },
        teacher: teachers[1] ? teachers[1]._id : teachers[0]._id,
        description: 'Advanced topics in differential and integral calculus',
        students: students.slice(1, 4).map(s => s._id)
      },
      {
        name: 'Technical Writing',
        subject: 'English',
        schedule: {
          dayOfWeek: 'Wednesday',
          startTime: '14:00',
          endTime: '15:30',
          room: 'ENG-301'
        },
        teacher: teachers[0]._id,
        description: 'Professional and technical writing skills',
        students: students.slice(0, 4).map(s => s._id)
      },
      {
        name: 'Data Structures',
        subject: 'Computer Science',
        schedule: {
          dayOfWeek: 'Thursday',
          startTime: '10:00',
          endTime: '11:30',
          room: 'CS-102'
        },
        teacher: teachers[0]._id,
        description: 'Fundamental data structures and algorithms',
        students: students.slice(2, 5).map(s => s._id)
      }
    ];

    // Clear existing Phase 3 data
    await Class.deleteMany({});
    await Session.deleteMany({});
    await Attendance.deleteMany({});
    console.log('🧹 Cleared existing Phase 3 data');

    // Create classes
    const createdClasses = [];
    for (const classData of sampleClasses) {
      const newClass = new Class(classData);
      const savedClass = await newClass.save();
      createdClasses.push(savedClass);
      console.log(`📚 Created class: ${savedClass.name}`);
    }

    // Create sessions for each class (last 2 weeks)
    const createdSessions = [];
    const today = new Date();
    
    for (const classDoc of createdClasses) {
      // Create 4 sessions over the past 2 weeks
      for (let i = 0; i < 4; i++) {
        const sessionDate = new Date(today);
        sessionDate.setDate(today.getDate() - (i * 3) - 1); // Every 3 days, starting yesterday

        const session = new Session({
          class: classDoc._id,
          date: sessionDate,
          title: `${classDoc.name} - Week ${Math.ceil((i + 1) / 2)}`,
          description: `Regular class session for ${classDoc.name}`,
          status: i === 0 ? 'active' : 'completed' // Most recent is active, others completed
        });

        const savedSession = await session.save();
        createdSessions.push(savedSession);

        // Create attendance records for this session
        const attendanceRecords = [];
        
        for (const studentId of classDoc.students) {
          // Simulate realistic attendance patterns
          const attendanceOptions = ['Present', 'Present', 'Present', 'Late', 'Absent']; // 60% present, 20% late, 20% absent
          const randomStatus = attendanceOptions[Math.floor(Math.random() * attendanceOptions.length)];
          
          const attendance = new Attendance({
            student: studentId,
            session: savedSession._id,
            status: randomStatus,
            method: Math.random() > 0.7 ? 'ai_recognition' : 'manual', // 30% AI, 70% manual
            markedBy: classDoc.teacher,
            confidenceScore: randomStatus === 'Present' && Math.random() > 0.7 ? 
              0.8 + Math.random() * 0.2 : undefined, // Some AI confidence scores
            markedAt: new Date(sessionDate.getTime() + Math.random() * 2 * 60 * 60 * 1000) // Random time during 2-hour window
          });

          const savedAttendance = await attendance.save();
          attendanceRecords.push(savedAttendance);
        }

        // Update session with attendance references
        savedSession.attendance = attendanceRecords.map(a => a._id);
        await savedSession.save();

        console.log(`📅 Created session: ${savedSession.title} with ${attendanceRecords.length} attendance records`);
      }
    }

    // Create some AI processing results for recent sessions
    const recentSessions = createdSessions.filter(s => s.status === 'active' || s.status === 'completed').slice(0, 3);
    
    for (const session of recentSessions) {
      session.aiProcessed = Math.random() > 0.5; // 50% chance of being AI processed
      if (session.aiProcessed) {
        const classDoc = createdClasses.find(c => c._id.toString() === session.class.toString());
        session.aiProcessingResults = {
          totalFacesDetected: classDoc.students.length + Math.floor(Math.random() * 2),
          studentsRecognized: Math.floor(classDoc.students.length * (0.7 + Math.random() * 0.3)),
          confidenceAverage: 0.8 + Math.random() * 0.2,
          processedAt: new Date(session.date.getTime() + 30 * 60 * 1000) // 30 mins after session
        };
        
        session.photoURL = `/uploads/sessions/sample_${session._id}_photo.jpg`;
        session.photoMetadata = {
          filename: `sample_${session._id}_photo.jpg`,
          originalName: 'class_photo.jpg',
          size: 1024000 + Math.floor(Math.random() * 2048000), // 1-3MB
          uploadedAt: session.aiProcessingResults.processedAt
        };
        
        await session.save();
        console.log(`🤖 Added AI processing results to session: ${session.title}`);
      }
    }

    // Print summary
    console.log('\n🎉 Phase 3 data seeding completed!');
    console.log(`📚 Created ${createdClasses.length} classes`);
    console.log(`📅 Created ${createdSessions.length} sessions`);
    
    const totalAttendance = await Attendance.countDocuments();
    console.log(`✅ Created ${totalAttendance} attendance records`);

    // Print class enrollment summary
    console.log('\n📊 Class Enrollment Summary:');
    for (const classDoc of createdClasses) {
      const teacher = teachers.find(t => t._id.toString() === classDoc.teacher.toString());
      console.log(`  📚 ${classDoc.name}`);
      console.log(`     👨‍🏫 Teacher: ${teacher.name}`);
      console.log(`     👨‍🎓 Students: ${classDoc.students.length}`);
      console.log(`     📅 Schedule: ${classDoc.schedule.dayOfWeek} ${classDoc.schedule.startTime}-${classDoc.schedule.endTime}`);
      console.log(`     🏫 Room: ${classDoc.schedule.room}`);
    }

    // Print attendance statistics
    console.log('\n📈 Attendance Statistics:');
    const attendanceStats = await Attendance.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    attendanceStats.forEach(stat => {
      console.log(`  ${stat._id}: ${stat.count} records`);
    });

    console.log('\n✅ Ready for Phase 3 testing!');
    console.log('🚀 You can now test the class management, session creation, and attendance tracking features.');

  } catch (error) {
    console.error('❌ Error seeding Phase 3 data:', error);
  } finally {
    mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the seeding function
if (require.main === module) {
  seedPhase3Data();
}

module.exports = seedPhase3Data;