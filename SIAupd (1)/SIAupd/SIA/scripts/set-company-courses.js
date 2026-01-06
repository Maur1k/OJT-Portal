const mongoose = require('mongoose');
require('dotenv').config();

const PartnerCompany = require('../models/PartnerCompany');
const Company = require('../models/Company');

// Course assignments for companies (you can modify these)
const COMPANY_COURSE_ASSIGNMENTS = {
  // IT/CS related companies - BSIT, BSCS, BSIS
  'DICT - Pangasinan': ['BSIT', 'BSCS', 'BSIS'],
  'PSU - Information and Communication Technology Management Office': ['BSIT', 'BSCS', 'BSIS'],
  'Makerspace Innovhub': ['BSIT', 'BSCS', 'BSIS'],
  'Offshore Concept BPO Services, Inc. (FullSuite)': ['BSIT', 'BSCS', 'BSIS'],
  
  // Engineering companies - BSCE, BSEMC, BSECE, BSME, BSEE, BSCpE
  'B&M Fiber-Tech Fiber Optics Installation Services': ['BSIT', 'BSCE', 'BSECE'],
  'National Irrigation Administration - PIMO': ['BSME', 'BSCE'],
  'Villasis Water District': ['BSME', 'BSCE'],
  
  // Government agencies - All courses (no restriction)
  // These will remain without restrictions (availableForCourses empty)
};

async function setCompanyCourses() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ojt_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB successfully!\n');

    let updatedCount = 0;

    // Update Partner Companies
    console.log('Updating Partner Companies...');
    for (const [companyName, courses] of Object.entries(COMPANY_COURSE_ASSIGNMENTS)) {
      const company = await PartnerCompany.findOne({ name: companyName });
      if (company) {
        company.availableForCourses = courses;
        await company.save();
        console.log(`  ✅ Updated: ${companyName} → ${courses.join(', ')}`);
        updatedCount++;
      } else {
        console.log(`  ⚠️  Not found: ${companyName}`);
      }
    }

    // Update regular Companies (if any exist)
    console.log('\nUpdating Companies...');
    const allCompanies = await Company.find({});
    if (allCompanies.length > 0) {
      console.log(`  Found ${allCompanies.length} company/companies.`);
      console.log('  Note: You can set course restrictions via the coordinator interface.');
    } else {
      console.log('  No companies found in Company collection.');
    }

    console.log(`\n✅ Updated ${updatedCount} partner companies with course restrictions.`);
    console.log('\nCompanies without restrictions will be available to ALL courses.');
    console.log('Companies with restrictions will only show to matching courses.\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✅ Database connection closed.');
  }
}

setCompanyCourses();

