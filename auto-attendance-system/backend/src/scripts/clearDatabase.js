const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Clear all temporary data from database
 * WARNING: This will delete ALL users and data
 */

const clearDatabase = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Delete all users
    console.log('🗑️  Clearing all users...');
    const userResult = await User.deleteMany({});
    console.log(`✅ Deleted ${userResult.deletedCount} users`);

    // Add more collections here if needed
    // const classResult = await Class.deleteMany({});
    // const sessionResult = await Session.deleteMany({});
    // const attendanceResult = await Attendance.deleteMany({});

    console.log('\n📊 Summary:');
    console.log(`   Users deleted: ${userResult.deletedCount}`);
    console.log('\n🎉 Database cleared successfully!');

  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📴 MongoDB connection closed');
    process.exit(0);
  }
};

// Run if executed directly
if (require.main === module) {
  clearDatabase();
}

module.exports = { clearDatabase };
