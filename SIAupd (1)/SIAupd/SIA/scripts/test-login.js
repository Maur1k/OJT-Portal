/**
 * Test login credentials
 * Run with: node scripts/test-login.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB\n');

    // Test coordinator login
    console.log('Testing Coordinator Login...');
    const coordinator = await User.findOne({ email: 'coordinator@psu.edu' });
    if (coordinator) {
      const testPassword = 'coordinator123';
      const isMatch = await coordinator.comparePassword(testPassword);
      console.log(`   Email: ${coordinator.email}`);
      console.log(`   Password Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
      if (!isMatch) {
        console.log('   ⚠️  Password does not match! Resetting...');
        coordinator.password = testPassword;
        await coordinator.save();
        console.log('   ✅ Password reset complete');
      }
    } else {
      console.log('   ❌ Coordinator not found');
    }

    console.log('');

    // Test director login
    console.log('Testing Director Login...');
    const director = await User.findOne({ email: 'director@psu.edu' });
    if (director) {
      const testPassword = 'director123';
      const isMatch = await director.comparePassword(testPassword);
      console.log(`   Email: ${director.email}`);
      console.log(`   Password Match: ${isMatch ? '✅ YES' : '❌ NO'}`);
      if (!isMatch) {
        console.log('   ⚠️  Password does not match! Resetting...');
        director.password = testPassword;
        await director.save();
        console.log('   ✅ Password reset complete');
      }
    } else {
      console.log('   ❌ Director not found');
    }

    console.log('\n✅ Test completed!');
    console.log('\nTry logging in again with:');
    console.log('Coordinator: coordinator@psu.edu / coordinator123');
    console.log('Director: director@psu.edu / director123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testLogin();

