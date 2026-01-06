/**
 * Check if admin accounts exist and verify their details
 * Run with: node scripts/check-accounts.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function checkAccounts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // Check coordinator
    const coordinator = await User.findOne({ email: 'coordinator@psu.edu' });
    if (coordinator) {
      console.log('✅ Coordinator Account Found:');
      console.log(`   Email: ${coordinator.email}`);
      console.log(`   Role: ${coordinator.role}`);
      console.log(`   Verified: ${coordinator.isVerified}`);
      console.log(`   Password Hash: ${coordinator.password.substring(0, 20)}...`);
    } else {
      console.log('❌ Coordinator account NOT found');
    }

    console.log('');

    // Check director
    const director = await User.findOne({ email: 'director@psu.edu' });
    if (director) {
      console.log('✅ Director Account Found:');
      console.log(`   Email: ${director.email}`);
      console.log(`   Role: ${director.role}`);
      console.log(`   Verified: ${director.isVerified}`);
      console.log(`   Password Hash: ${director.password.substring(0, 20)}...`);
    } else {
      console.log('❌ Director account NOT found');
    }

    console.log('\n---\n');
    console.log('Login Credentials:');
    console.log('Coordinator: coordinator@psu.edu / coordinator123');
    console.log('Director: director@psu.edu / director123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAccounts();

