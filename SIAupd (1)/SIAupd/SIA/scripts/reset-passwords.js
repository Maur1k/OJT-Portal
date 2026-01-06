/**
 * Reset passwords for coordinator and director accounts
 * Run with: node scripts/reset-passwords.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function resetPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Reset coordinator password
    const coordinatorEmail = 'coordinator@psu.edu';
    const coordinatorPassword = 'coordinator123';
    
    const coordinator = await User.findOne({ email: coordinatorEmail });
    if (coordinator) {
      coordinator.password = coordinatorPassword;
      await coordinator.save();
      console.log('✅ Coordinator password reset:');
      console.log(`   Email: ${coordinatorEmail}`);
      console.log(`   Password: ${coordinatorPassword}`);
    } else {
      console.log('❌ Coordinator account not found');
    }

    // Reset director password
    const directorEmail = 'director@psu.edu';
    const directorPassword = 'director123';
    
    const director = await User.findOne({ email: directorEmail });
    if (director) {
      director.password = directorPassword;
      await director.save();
      console.log('✅ Director password reset:');
      console.log(`   Email: ${directorEmail}`);
      console.log(`   Password: ${directorPassword}`);
    } else {
      console.log('❌ Director account not found');
    }

    console.log('\n✅ Password reset completed!');
    console.log('\nYou can now login with these credentials.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting passwords:', error);
    process.exit(1);
  }
}

resetPasswords();

