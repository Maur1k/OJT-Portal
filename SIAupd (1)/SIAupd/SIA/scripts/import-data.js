const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal';

// Collection mapping: filename -> collection name
const collectionMap = {
  'ojt_portal.users.json': 'users',
  'ojt_portal.studentprofiles.json': 'studentprofiles',
  'ojt_portal.requirementfiles.json': 'requirementfiles',
  'ojt_portal.repositoryfiles.json': 'repositoryfiles',
  'ojt_portal.psu_partnered_companies.json': 'psu_partnered_companies',
  'ojt_portal.moas.json': 'moas',
  'ojt_portal.moarequests.json': 'moarequests',
  'ojt_portal.company_applications.json': 'company_applications',
  'ojt_portal.announcements.json': 'announcements',
  'ojt_portal.activitylogs.json': 'activitylogs',
  'ojt_portal.companies.json': 'companies'
};

// Function to convert MongoDB Extended JSON to regular objects
function convertExtendedJSON(obj) {
  if (Array.isArray(obj)) {
    return obj.map(convertExtendedJSON);
  }
  
  if (obj !== null && typeof obj === 'object') {
    // Handle $oid
    if (obj.$oid) {
      return new mongoose.Types.ObjectId(obj.$oid);
    }
    
    // Handle $date
    if (obj.$date) {
      return new Date(obj.$date);
    }
    
    // Recursively convert nested objects
    const converted = {};
    for (const key in obj) {
      converted[key] = convertExtendedJSON(obj[key]);
    }
    return converted;
  }
  
  return obj;
}

async function importData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully!\n');

    const db = mongoose.connection.db;
    const dataDir = path.join(__dirname, '../../..'); // Go up to root directory where JSON files are

    // Import each file
    for (const [filename, collectionName] of Object.entries(collectionMap)) {
      const filePath = path.join(dataDir, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename} - Skipping...`);
        continue;
      }

      console.log(`📄 Importing ${filename} into collection: ${collectionName}...`);
      
      // Read and parse JSON file
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);
      
      if (!Array.isArray(data) || data.length === 0) {
        console.log(`   ℹ️  No data to import (empty array)`);
        continue;
      }

      // Convert MongoDB Extended JSON format
      const convertedData = convertExtendedJSON(data);
      
      // Clear existing collection (optional - comment out if you want to keep existing data)
      const existingCount = await db.collection(collectionName).countDocuments();
      if (existingCount > 0) {
        console.log(`   ⚠️  Collection already has ${existingCount} documents. Clearing...`);
        await db.collection(collectionName).deleteMany({});
      }

      // Insert data
      const result = await db.collection(collectionName).insertMany(convertedData);
      console.log(`   ✅ Successfully imported ${result.insertedCount} documents\n`);
    }

    console.log('🎉 Data import completed successfully!');
    
    // Show summary
    console.log('\n📊 Collection Summary:');
    for (const [filename, collectionName] of Object.entries(collectionMap)) {
      const count = await db.collection(collectionName).countDocuments();
      console.log(`   ${collectionName}: ${count} documents`);
    }

  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed.');
  }
}

// Run import
importData();

