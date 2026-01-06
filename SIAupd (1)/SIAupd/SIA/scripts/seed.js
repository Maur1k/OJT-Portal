/**
 * Seed script to create initial coordinator and director accounts
 * Run with: node scripts/seed.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Create coordinator account
    const coordinatorEmail = 'coordinator@psu.edu';
    const coordinatorPassword = 'coordinator123';
    
    const existingCoordinator = await User.findOne({ email: coordinatorEmail });
    if (!existingCoordinator) {
      const coordinator = new User({
        email: coordinatorEmail,
        password: coordinatorPassword,
        role: 'coordinator',
        isVerified: true
      });
      await coordinator.save();
      console.log('✅ Coordinator account created:');
      console.log(`   Email: ${coordinatorEmail}`);
      console.log(`   Password: ${coordinatorPassword}`);
    } else {
      console.log('⚠️  Coordinator account already exists');
    }

    // Create director account
    const directorEmail = 'director@psu.edu';
    const directorPassword = 'director123';
    
    const existingDirector = await User.findOne({ email: directorEmail });
    if (!existingDirector) {
      const director = new User({
        email: directorEmail,
        password: directorPassword,
        role: 'director',
        isVerified: true
      });
      await director.save();
      console.log('✅ Director account created:');
      console.log(`   Email: ${directorEmail}`);
      console.log(`   Password: ${directorPassword}`);
    } else {
      console.log('⚠️  Director account already exists');
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\nYou can now login with these credentials.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();

