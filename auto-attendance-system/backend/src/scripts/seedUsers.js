const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Seed script to populate database with test users
 * Creates sample teacher and student accounts for development
 */

const seedUsers = [
  // Teacher accounts
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@school.edu',
    password: 'Teacher123!',
    role: 'teacher'
  },
  {
    name: 'Prof. Michael Chen',
    email: 'michael.chen@school.edu',
    password: 'Teacher123!',
    role: 'teacher'
  },
  // Student accounts
  {
    name: 'Alice Smith',
    email: 'alice.smith@student.edu',
    password: 'Student123!',
    role: 'student'
  },
  {
    name: 'Bob Wilson',
    email: 'bob.wilson@student.edu',
    password: 'Student123!',
    role: 'student'
  },
  {
    name: 'Carol Davis',
    email: 'carol.davis@student.edu',
    password: 'Student123!',
    role: 'student'
  },
  {
    name: 'David Brown',
    email: 'david.brown@student.edu',
    password: 'Student123!',
    role: 'student'
  }
];

/**
 * Connect to MongoDB and seed users
 */
const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional - comment out if you want to keep existing data)
    console.log('🗑️ Clearing existing users...');
    await User.deleteMany({});
    console.log('✅ Existing users cleared');

    // Create seed users
    console.log('🌱 Creating seed users...');
    
    for (const userData of seedUsers) {
      try {
        // Check if user already exists
        const existingUser = await User.findByEmail(userData.email);
        if (existingUser) {
          console.log(`⚠️ User already exists: ${userData.email}`);
          continue;
        }

        // Create new user
        const user = new User(userData);
        await user.save();
        console.log(`✅ Created ${userData.role}: ${userData.name} (${userData.email})`);
      } catch (error) {
        console.error(`❌ Error creating user ${userData.email}:`, error.message);
      }
    }

    // Display summary
    const teacherCount = await User.countDocuments({ role: 'teacher' });
    const studentCount = await User.countDocuments({ role: 'student' });
    
    console.log('\n📊 Seeding Summary:');
    console.log(`   Teachers: ${teacherCount}`);
    console.log(`   Students: ${studentCount}`);
    console.log(`   Total Users: ${teacherCount + studentCount}`);

    console.log('\n🔑 Test Login Credentials:');
    console.log('   Teachers:');
    console.log('     - sarah.johnson@school.edu / Teacher123!');
    console.log('     - michael.chen@school.edu / Teacher123!');
    console.log('   Students:');
    console.log('     - alice.smith@student.edu / Student123!');
    console.log('     - bob.wilson@student.edu / Student123!');

    console.log('\n🎉 Database seeding completed successfully!');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
    process.exit(0);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, seedUsers };