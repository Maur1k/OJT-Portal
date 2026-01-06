const express = require('express');
const router = express.Router();
const { verifyToken, isVerified, logActivity } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { uploadMOA, uploadRepository, uploadMOARequest } = require('../middleware/upload');
const fs = require('fs');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const MOA = require('../models/MOA');
const MOARequest = require('../models/MOARequest');
const Company = require('../models/Company');
const PartnerCompany = require('../models/PartnerCompany');
const CompanyApplication = require('../models/CompanyApplication');
const RepositoryFile = require('../models/RepositoryFile');
const Announcement = require('../models/Announcement');
const REQUIREMENT_TEMPLATE_PATHS = {
  pre_application: '/templates/pre_deployment/01 APPLICATION FOR INTERNSHIP_2024.docx',
  pre_units_cert: '/templates/pre_deployment/02 CERTIFICATION OF UNITS EARNED FOR PRACTICUM_2024.docx',
  pre_consent: '/templates/pre_deployment/03 CONSENT AND WAIVER_2024.docx',
  pre_endorsement: '/templates/pre_deployment/05 ENDORSEMENT LETTER_2024.docx',
  pre_resume: '/templates/pre_deployment/09 INTERNSHIP RESUME_2024.docx',
  pre_release: '/templates/pre_deployment/12 INTERNSHIP RELEASE FORM_2024.docx',
  pre_time_frame: '/templates/pre_deployment/14 INTERNSHIP TIMEFRAME_2024.docx',
  pre_record: '/templates/pre_deployment/Record File - REV1 (1).docx',
  post_internship_evaluation: '/templates/post_deployment/11 INTERNSHIP EVALUATION FORM_2024.docx',
  post_practicum_weekly_report: '/templates/post_deployment/16 PRACTICUM WEEKLY REPORT_2024.docx',
  post_student_feedback: '/templates/post_deployment/17 STUDENT-TRAINEES FEEDBACK FORM_2024.docx',
  post_supervisor_feedback: '/templates/post_deployment/18 TRAINING SUPERVISOR_S FEEDBACK FORM_2024.docx',
  post_partner_self_ratee: '/templates/post_deployment/19b Evaluation Instrument of PSU Partner Agencies (Self Ratee)_2024.docx',
  post_partner_student: '/templates/post_deployment/19c Evaluation Instrument of PSU Partner Agencies (Student).docx',
  legal_internship_agreement: '/templates/legal_forms/10 INTERNSHIP AGREEMENT_2024.docx',
  legal_memorandum_of_agreement: '/templates/legal_forms/10b MEMORANDUM OF AGREEMENT rev.02 (1).docx',
  legal_training_waiver: '/templates/legal_forms/15 TRAINING AGREEMENT AND_2024.docx'
};
const REQUIREMENT_DEFINITIONS = {
  preDeployment: [
    { key: 'pre_application', label: 'Application for Internship' },
    { key: 'pre_units_cert', label: 'Certification of Units Earned for Practicum' },
    { key: 'pre_consent', label: 'Consent and Waiver' },
    { key: 'pre_endorsement', label: 'Endorsement Letter' },
    { key: 'pre_resume', label: 'Internship Resume' },
    { key: 'pre_release', label: 'Internship Release Form' },
    { key: 'pre_time_frame', label: 'Internship Time Frame' },
    { key: 'pre_record', label: 'Record File' }
  ],
  legalForms: [
    { key: 'legal_internship_agreement', label: 'Internship Agreement' },
    { key: 'legal_memorandum_of_agreement', label: 'Memorandum of Agreement' },
    { key: 'legal_training_waiver', label: 'Training Agreement and Liability Waiver' }
  ],
  postDeployment: [
    { key: 'post_internship_evaluation', label: 'Internship Evaluation Form' },
    { key: 'post_practicum_weekly_report', label: 'Practicum Weekly Report' },
    { key: 'post_student_feedback', label: 'Student Trainees Feedback Form' },
    { key: 'post_supervisor_feedback', label: 'Training Supervisor Feedback Form' },
    { key: 'post_partner_self_ratee', label: 'Evaluation Instrument of PSU Partner Agencies (Self Ratee)' },
    { key: 'post_partner_student', label: 'Evaluation Instrument of PSU Partner Agencies (Student)' }
  ]
};
const ALL_REQUIREMENT_KEYS = [
  ...REQUIREMENT_DEFINITIONS.preDeployment.map(item => item.key),
  ...REQUIREMENT_DEFINITIONS.legalForms.map(item => item.key),
  ...REQUIREMENT_DEFINITIONS.postDeployment.map(item => item.key)
];
const REQUIREMENT_LOOKUP = ALL_REQUIREMENT_KEYS.reduce((acc, key) => {
  const def =
    REQUIREMENT_DEFINITIONS.preDeployment.find(item => item.key === key) ||
    REQUIREMENT_DEFINITIONS.legalForms.find(item => item.key === key) ||
    REQUIREMENT_DEFINITIONS.postDeployment.find(item => item.key === key);
  acc[key] = { ...def, templateUrl: REQUIREMENT_TEMPLATE_PATHS[key] || null };
  return acc;
}, {});

// Apply authentication and role check to all routes
router.use(verifyToken);
router.use(authorize('student'));

// Student Dashboard
router.get('/dashboard', isVerified, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    
    // Get both MOA request and MOA record
    const moaRequest = await MOARequest.findOne({ studentId: req.user._id })
      .sort({ submittedAt: -1 }); // Get the most recent request
    
    let moa = await MOA.findOne({ studentId: req.user._id });
    
    // If MOA request exists and is accepted, ensure MOA record exists and is synced
    if (moaRequest && moaRequest.status === 'accepted' && !moa) {
      // MOA request was accepted but MOA record doesn't exist - this shouldn't happen but handle it
      moa = null;
    }
    
    // Determine what to display based on MOA request and MOA record status
    let displayMoa = null;
    
    if (moaRequest) {
      if (moaRequest.status === 'accepted') {
        // MOA request was accepted - show "accepted" status, but include MOA record info if available
        if (moa) {
          // Show "accepted" as status, but include MOA record details
          displayMoa = {
            status: 'accepted', // Show accepted status from request
            moaRecordStatus: moa.status, // Store MOA record status for reference
            coordinatorComment: moa.coordinatorComment || moaRequest.coordinatorComment || '',
            uploadedAt: moa.uploadedAt || moaRequest.submittedAt,
            updatedAt: moa.updatedAt || moaRequest.reviewedAt || moaRequest.updatedAt,
            fileName: moa.fileName || moaRequest.fileName,
            filePath: moa.filePath || moaRequest.filePath,
            requestAccepted: true
          };
        } else {
          // Request accepted but MOA record not created yet (shouldn't happen, but handle it)
          displayMoa = {
            status: 'accepted',
            coordinatorComment: moaRequest.coordinatorComment || '',
            uploadedAt: moaRequest.submittedAt,
            updatedAt: moaRequest.reviewedAt || moaRequest.updatedAt,
            fileName: moaRequest.fileName,
            filePath: moaRequest.filePath,
            requestAccepted: true
          };
        }
      } else if (moaRequest.status === 'for signature') {
        // MOA request is for signature - show MOA record status if available
        if (moa) {
          displayMoa = {
            status: 'for signature',
            moaRecordStatus: moa.status,
            coordinatorComment: moa.coordinatorComment || moaRequest.coordinatorComment || '',
            uploadedAt: moa.uploadedAt || moaRequest.submittedAt,
            updatedAt: moa.updatedAt || moaRequest.reviewedAt || moaRequest.updatedAt,
            fileName: moa.fileName || moaRequest.fileName,
            filePath: moa.filePath || moaRequest.filePath,
            requestForSignature: true
          };
        } else {
          displayMoa = {
            status: 'for signature',
            coordinatorComment: moaRequest.coordinatorComment || '',
            uploadedAt: moaRequest.submittedAt,
            updatedAt: moaRequest.reviewedAt || moaRequest.updatedAt,
            fileName: moaRequest.fileName,
            filePath: moaRequest.filePath,
            isFromRequest: true
          };
        }
      } else if (moaRequest.status === 'processing') {
        // Show MOA request processing status
        displayMoa = {
          status: 'processing',
          coordinatorComment: moaRequest.coordinatorComment || '',
          uploadedAt: moaRequest.submittedAt,
          updatedAt: moaRequest.updatedAt,
          fileName: moaRequest.fileName,
          filePath: moaRequest.filePath,
          isFromRequest: true
        };
      } else if (moaRequest.status === 'denied') {
        // Show MOA request denied status
        displayMoa = {
          status: 'denied',
          coordinatorComment: moaRequest.coordinatorComment || '',
          uploadedAt: moaRequest.submittedAt,
          updatedAt: moaRequest.reviewedAt || moaRequest.updatedAt,
          fileName: moaRequest.fileName,
          filePath: moaRequest.filePath,
          isFromRequest: true
        };
      }
    } else if (moa) {
      // No MOA request but MOA record exists (legacy or direct upload)
      displayMoa = moa;
    }
    
    const now = new Date();
    const announcements = await Announcement.find({
      isActive: true,
      isArchived: { $ne: true },
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('postedBy', 'email');
    
    const fileCount = await RepositoryFile.countDocuments({ studentId: req.user._id });
    
    res.render('student/dashboard', {
      title: 'Student Dashboard',
      user: req.user,
      profile,
      moa: displayMoa,
      moaRequest,
      announcements,
      fileCount,
      query: req.query
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { error: 'Error loading dashboard', title: 'Error' });
  }
});

// Student Profile
router.get('/profile', isVerified, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    
    // Get approved companies/agencies for this student
    const approvedCompanies = await Company.find({ students: req.user._id })
      .sort({ approvedAt: -1 });
    
    // Get accepted MOA requests
    const acceptedRequests = await MOARequest.find({ 
      studentId: req.user._id, 
      status: 'accepted' 
    })
      .populate('approvedCompanyId')
      .sort({ reviewedAt: -1 });
    
    res.render('student/profile', {
      title: 'My Profile',
      user: req.user,
      profile,
      approvedCompanies,
      acceptedRequests,
      query: req.query
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.render('error', { error: 'Error loading profile', title: 'Error' });
  }
});

// Company Profile (example)
router.get('/companies/:id', isVerified, async (req, res) => {
  try {
    let company = null;

    if (req.params.id !== 'example') {
      company = await Company.findById(req.params.id);
      if (!company) {
        const partnerCompany = await PartnerCompany.findById(req.params.id);
        if (partnerCompany) {
          company = {
            ...partnerCompany.toObject(),
            address: partnerCompany.location,
            contact: partnerCompany.contact || '',
            email: partnerCompany.email || '',
            description: partnerCompany.description || '',
            notes: partnerCompany.notes || '',
            availableForCourses: partnerCompany.availableForCourses || []
          };
        }
      } else {
        // Regular company - ensure availableForCourses is included
        company = company.toObject();
        company.availableForCourses = company.availableForCourses || [];
      }
    }

    if (!company) {
      company = {
        _id: 'example',
        name: 'Example Tech Corp',
        type: 'company',
        address: '123 Sample St, Urdaneta City',
        contact: '(000) 000-0000',
        email: 'hello@example.com',
        website: 'https://example.com',
        description: 'This is an example company profile. Replace with real company data and coordinator notification logic.',
        notes: '',
        approvedAt: new Date()
      };
    }

    const isExample = company._id === 'example';

    // Check if student has already applied to this company
    let existingApplication = null;
    if (!isExample) {
      existingApplication = await CompanyApplication.findOne({
        studentId: req.user._id,
        companyId: company._id
      });
    }

    // availableForCourses should already be set from above

    res.render('student/company-profile', {
      title: 'Company Profile',
      user: req.user,
      company,
      isExample,
      existingApplication,
      query: req.query
    });
  } catch (error) {
    console.error('Company profile error:', error);
    res.render('error', { error: 'Error loading company profile', title: 'Error' });
  }
});

// Company List
router.get('/companies', isVerified, async (req, res) => {
  try {
    // Get student profile to filter by course/department
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    const studentCourse = profile ? profile.course : null;
    
    // Helper function to check if company is available for student's course
    const isCompanyAvailableForCourse = (company, course) => {
      if (!course) return true; // If no course set, show all
      
      // If company has no course restrictions, show it to all
      if (!company.availableForCourses || company.availableForCourses.length === 0) {
        return true;
      }
      
      // Check if student's course matches any of the company's allowed courses
      // Handle both exact matches and case-insensitive matches
      return company.availableForCourses.some(allowedCourse => {
        const normalizedAllowed = allowedCourse.toLowerCase().trim();
        const normalizedStudent = course.toLowerCase().trim();
        return normalizedAllowed === normalizedStudent ||
               normalizedStudent.includes(normalizedAllowed) ||
               normalizedAllowed.includes(normalizedStudent);
      });
    };
    
    // Get all companies and filter by course
    const allCompanies = await Company.find({}).sort({ name: 1 });
    const companies = studentCourse 
      ? allCompanies.filter(company => isCompanyAvailableForCourse(company, studentCourse))
      : allCompanies;
    
    // Get all partner companies and filter by course
    const allPartnerCompanies = await PartnerCompany.find({}).sort({ name: 1 });
    const partnerCompanies = studentCourse
      ? allPartnerCompanies.filter(company => isCompanyAvailableForCourse(company, studentCourse))
      : allPartnerCompanies;

    const merged = [
      ...companies.map(c => ({
        _id: c._id,
        name: c.name,
        type: c.type,
        address: c.address,
        contact: c.contact,
        email: c.email,
        website: c.website,
        description: '',
        notes: '',
        availableForCourses: c.availableForCourses || [],
        source: 'company'
      })),
      ...partnerCompanies.map(p => ({
        _id: p._id,
        name: p.name,
        type: p.type || 'company',
        address: p.location,
        contact: '',
        email: '',
        website: p.website,
        description: p.description || '',
        notes: p.notes || '',
        availableForCourses: p.availableForCourses || [],
        source: 'partner'
      }))
    ].sort((a, b) => a.name.localeCompare(b.name));

    const hasCompanies = merged && merged.length > 0;
    const data = hasCompanies
      ? merged
      : [{
          _id: 'example',
          name: 'Example Tech Corp',
          type: 'company',
          address: '123 Sample St, Urdaneta City',
          contact: '(000) 000-0000',
          email: 'hello@example.com',
          website: 'https://example.com',
          description: 'This is an example company. Add real companies in the database.',
          notes: '',
          approvedAt: new Date(),
          source: 'example'
        }];

    // Get application statuses for all companies
    const companyIds = data.filter(c => c._id !== 'example').map(c => c._id);
    const applications = await CompanyApplication.find({
      studentId: req.user._id,
      companyId: { $in: companyIds }
    });
    const applicationMap = {};
    applications.forEach(app => {
      applicationMap[app.companyId.toString()] = app;
    });

    // Add application status to each company
    const companiesWithStatus = data.map(company => ({
      ...company,
      application: company._id !== 'example' ? applicationMap[company._id.toString()] || null : null
    }));

    res.render('student/company-list', {
      title: 'Companies',
      user: req.user,
      companies: companiesWithStatus,
      hasCompanies,
      studentCourse: studentCourse,
      query: req.query
    });
  } catch (error) {
    console.error('Company list error:', error);
    res.render('error', { error: 'Error loading companies', title: 'Error' });
  }
});

// Company Apply (example notifier)
router.post('/companies/:id/apply', isVerified, async (req, res) => {
  try {
    // Find the company (supports both Company and PartnerCompany collections)
    let company = await Company.findById(req.params.id);
    let source = 'company';

    if (!company) {
      const partner = await PartnerCompany.findById(req.params.id);
      if (partner) {
        source = 'partner';
        company = {
          _id: partner._id,
          name: partner.name,
          type: partner.type || 'company',
          address: partner.location || '',
          contact: partner.contact || '',
          email: partner.email || '',
          website: partner.website || ''
        };
      }
    }

    if (!company) {
      return res.redirect(`/student/companies/${req.params.id}?error=Company not found`);
    }

    // Check if application already exists
    const existing = await CompanyApplication.findOne({
      studentId: req.user._id,
      companyId: company._id
    });

    if (existing) {
      // If it's pending, allow cancellation via cancel route
      if (existing.status === 'pending') {
        return res.redirect(`/student/companies/${req.params.id}?error=${encodeURIComponent('You already have a pending application. Use Cancel to withdraw it.')}`);
      }
      const msg =
        existing.status === 'accepted'
          ? 'You already have an accepted application for this company.'
          : 'You have an application record for this company.';
      return res.redirect(`/student/companies/${req.params.id}?error=${encodeURIComponent(msg)}`);
    }

    const application = new CompanyApplication({
      studentId: req.user._id,
      companyId: company._id,
      companyName: company.name,
      companyType: company.type || 'company',
      source,
      status: 'pending'
    });

    await application.save();

    // Log activity as a lightweight notification for coordinators
    await logActivity(
      req.user._id,
      'APPLY_COMPANY',
      `Student applied to ${company.name}`,
      company._id,
      {
        companyId: company._id,
        companyName: company.name,
        source
      }
    );

    res.redirect(`/student/companies/${req.params.id}?success=Application sent. Coordinator has been notified.`);
  } catch (error) {
    console.error('Company apply error:', error);
    res.redirect(`/student/companies/${req.params.id}?error=Error sending application.`);
  }
});

// Cancel Company Application
router.post('/companies/:id/cancel', isVerified, async (req, res) => {
  try {
    const application = await CompanyApplication.findOne({
      studentId: req.user._id,
      companyId: req.params.id,
      status: 'pending'
    });

    if (!application) {
      return res.redirect(`/student/companies/${req.params.id}?error=${encodeURIComponent('Application not found or cannot be cancelled. Only pending applications can be cancelled.')}`);
    }

    application.status = 'cancelled';
    application.reviewedAt = Date.now();
    await application.save();

    await logActivity(
      req.user._id,
      'CANCEL_COMPANY_APPLICATION',
      `Student cancelled application to ${application.companyName}`,
      application.companyId,
      {
        companyId: application.companyId,
        companyName: application.companyName
      }
    );

    res.redirect(`/student/companies/${req.params.id}?success=Application cancelled successfully.`);
  } catch (error) {
    console.error('Cancel application error:', error);
    res.redirect(`/student/companies/${req.params.id}?error=Error cancelling application.`);
  }
});

// Update Profile
router.post('/profile', isVerified, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    
    if (!profile) {
      return res.redirect('/student/profile');
    }

    Object.keys(req.body).forEach(key => {
      if (req.body[key] && key !== 'userId') {
        if (key === 'emergencyContactName' || key === 'emergencyContactRelationship' || key === 'emergencyContactNumber') {
          profile.emergencyContact = {
            name: req.body.emergencyContactName || profile.emergencyContact?.name,
            relationship: req.body.emergencyContactRelationship || profile.emergencyContact?.relationship,
            contactNumber: req.body.emergencyContactNumber || profile.emergencyContact?.contactNumber
          };
        } else if (key === 'narrative') {
          profile.narrative = req.body.narrative;
        } else {
          profile[key] = req.body[key];
        }
      }
    });

    await profile.save();
    await logActivity(req.user._id, 'UPDATE_PROFILE', 'Student updated profile');

    res.redirect('/student/profile?success=Profile updated successfully');
  } catch (error) {
    console.error('Update profile error:', error);
    res.redirect('/student/profile?error=Error updating profile');
  }
});

// Upload Resume
router.post('/profile/resume', isVerified, require('../middleware/upload').uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/student/profile?error=Please select a file to upload');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.redirect('/student/profile?error=Profile not found');
    }

    // Delete old resume if exists
    if (profile.resumePath && fs.existsSync(profile.resumePath)) {
      fs.unlinkSync(profile.resumePath);
    }

    profile.resumePath = req.file.path;
    await profile.save();
    await logActivity(req.user._id, 'UPLOAD_RESUME', 'Student uploaded resume');

    res.redirect('/student/profile?success=Resume uploaded successfully');
  } catch (error) {
    console.error('Resume upload error:', error);
    res.redirect('/student/profile?error=Error uploading resume');
  }
});

// Upload Proof Photos
router.post('/profile/proof-photos', isVerified, require('../middleware/upload').uploadProofPhotos.array('proofPhotos', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.redirect('/student/profile?error=Please select at least one photo to upload');
    }

    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.redirect('/student/profile?error=Profile not found');
    }

    // Initialize proofPhotos array if it doesn't exist
    if (!profile.proofPhotos) {
      profile.proofPhotos = [];
    }

    // Add new photos
    req.files.forEach(file => {
      profile.proofPhotos.push(file.path);
    });

    await profile.save();
    await logActivity(req.user._id, 'UPLOAD_PROOF_PHOTOS', `Student uploaded ${req.files.length} proof photo(s)`);

    res.redirect('/student/profile?success=Proof photos uploaded successfully');
  } catch (error) {
    console.error('Proof photos upload error:', error);
    res.redirect('/student/profile?error=Error uploading proof photos');
  }
});

// Delete Proof Photo
router.post('/profile/proof-photos/:index/delete', isVerified, async (req, res) => {
  try {
    const profile = await StudentProfile.findOne({ userId: req.user._id });
    if (!profile || !profile.proofPhotos) {
      return res.redirect('/student/profile?error=Photo not found');
    }

    const index = parseInt(req.params.index);
    if (index < 0 || index >= profile.proofPhotos.length) {
      return res.redirect('/student/profile?error=Invalid photo index');
    }

    const photoPath = profile.proofPhotos[index];
    if (fs.existsSync(photoPath)) {
      fs.unlinkSync(photoPath);
    }

    profile.proofPhotos.splice(index, 1);
    await profile.save();
    await logActivity(req.user._id, 'DELETE_PROOF_PHOTO', 'Student deleted proof photo');

    res.redirect('/student/profile?success=Proof photo deleted successfully');
  } catch (error) {
    console.error('Delete proof photo error:', error);
    res.redirect('/student/profile?error=Error deleting proof photo');
  }
});

// MOA Upload Page
router.get('/moa', isVerified, async (req, res) => {
  try {
    // Get both MOA request and MOA record
    const moaRequest = await MOARequest.findOne({ studentId: req.user._id })
      .sort({ submittedAt: -1 });
    
    let moa = await MOA.findOne({ studentId: req.user._id });
    
    // If MOA request is accepted, ensure we show the MOA record
    // If MOA request is processing/denied, show that status
    let displayMoa = moa;
    
    if (moaRequest && moaRequest.status === 'accepted' && moa) {
      // Show MOA record when request is accepted
      displayMoa = moa;
    } else if (moaRequest && (moaRequest.status === 'processing' || moaRequest.status === 'denied')) {
      // Show MOA request info when processing or denied
      displayMoa = {
        status: moaRequest.status === 'denied' ? 'denied' : 'processing',
        coordinatorComment: moaRequest.coordinatorComment || '',
        uploadedAt: moaRequest.submittedAt,
        updatedAt: moaRequest.reviewedAt || moaRequest.updatedAt,
        fileName: moaRequest.fileName,
        filePath: moaRequest.filePath,
        isFromRequest: true
      };
    }
    
    res.render('student/moa', {
      title: 'MOA Upload',
      user: req.user,
      moa: displayMoa,
      moaRequest,
      query: req.query
    });
  } catch (error) {
    console.error('MOA page error:', error);
    res.render('error', { error: 'Error loading MOA page', title: 'Error' });
  }
});

// MOA Upload Handler
router.post('/moa', isVerified, uploadMOA.single('moaFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('student/moa', {
        title: 'MOA Upload',
        user: req.user,
        moa: null,
        error: 'Please select a file to upload'
      });
    }

    const existingMOA = await MOA.findOne({ studentId: req.user._id });
    
    if (existingMOA) {
      // Update existing MOA
      existingMOA.filePath = req.file.path;
      existingMOA.fileName = req.file.filename;
      existingMOA.fileSize = req.file.size;
      existingMOA.mimeType = req.file.mimetype;
      existingMOA.status = 'processing';
      existingMOA.coordinatorComment = '';
      await existingMOA.save();
    } else {
      // Create new MOA
      const moa = new MOA({
        studentId: req.user._id,
        filePath: req.file.path,
        fileName: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        status: 'processing'
      });
      await moa.save();
    }

    await logActivity(req.user._id, 'UPLOAD_MOA', 'Student uploaded MOA file');
    res.redirect('/student/moa?success=MOA uploaded successfully');
  } catch (error) {
    console.error('MOA upload error:', error);
    res.render('student/moa', {
      title: 'MOA Upload',
      user: req.user,
      moa: null,
      error: 'Error uploading MOA. Please try again.'
    });
  }
});

// Repository - View Files
router.get('/repository', isVerified, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;
    const fileType = req.query.fileType || 'all';
    const search = req.query.search || '';

    let query = { studentId: req.user._id };
    
    if (fileType !== 'all') {
      query.fileType = fileType;
    }
    
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const files = await RepositoryFile.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalFiles = await RepositoryFile.countDocuments(query);
    const totalPages = Math.ceil(totalFiles / limit);

    res.render('student/repository', {
      title: 'My Repository',
      user: req.user,
      files,
      currentPage: page,
      totalPages,
      fileType,
      search
    });
  } catch (error) {
    console.error('Repository error:', error);
    res.render('error', { error: 'Error loading repository', title: 'Error' });
  }
});

// Repository - Upload File
router.post('/repository', isVerified, uploadRepository.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.redirect('/student/repository?error=Please select a file to upload');
    }

    const file = new RepositoryFile({
      studentId: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileType: req.body.fileType || 'other',
      description: req.body.description || ''
    });

    await file.save();
    await logActivity(req.user._id, 'UPLOAD_FILE', `Student uploaded ${req.body.fileType} file: ${req.file.originalname}`);

    res.redirect('/student/repository?success=File uploaded successfully');
  } catch (error) {
    console.error('File upload error:', error);
    res.redirect('/student/repository?error=Error uploading file');
  }
});

// Requirements Tracker - View
router.get('/requirements', isVerified, async (req, res) => {
  try {
    const files = await RepositoryFile.find({
      studentId: req.user._id,
      fileType: { $in: ALL_REQUIREMENT_KEYS }
    }).sort({ uploadedAt: -1 });

    const latestByType = {};
    files.forEach(file => {
      if (!latestByType[file.fileType]) {
        latestByType[file.fileType] = file;
      }
    });

    const mapWithStatus = group =>
      group.map(item => ({
        ...item,
        file: latestByType[item.key] || null,
        templateUrl: REQUIREMENT_TEMPLATE_PATHS[item.key] || null
      }));

    const preRequirements = mapWithStatus(REQUIREMENT_DEFINITIONS.preDeployment);
    const legalRequirements = mapWithStatus(REQUIREMENT_DEFINITIONS.legalForms);
    const postRequirements = mapWithStatus(REQUIREMENT_DEFINITIONS.postDeployment);

    const totalRequirements = preRequirements.length + legalRequirements.length + postRequirements.length;
    const completedRequirements = [...preRequirements, ...legalRequirements, ...postRequirements].filter(r => r.file).length;
    const progress = totalRequirements ? Math.round((completedRequirements / totalRequirements) * 100) : 0;

    res.render('student/requirements', {
      title: 'Requirements',
      user: req.user,
      preRequirements,
      legalRequirements,
      postRequirements,
      progress,
      totalRequirements,
      completedRequirements,
      query: req.query
    });
  } catch (error) {
    console.error('Requirements page error:', error);
    res.render('error', { error: 'Error loading requirements', title: 'Error' });
  }
});

// Requirements Tracker - Upload
router.post('/requirements/upload', isVerified, uploadRepository.single('file'), async (req, res) => {
  try {
    const requirementKey = req.body.requirementKey;

    if (!requirementKey || !REQUIREMENT_LOOKUP[requirementKey]) {
      return res.redirect('/student/requirements?error=Invalid requirement selected');
    }

    if (!req.file) {
      return res.redirect('/student/requirements?error=Please select a file to upload');
    }

    const requirement = REQUIREMENT_LOOKUP[requirementKey];

    const file = new RepositoryFile({
      studentId: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      fileType: requirementKey,
      description: requirement.label
    });

    await file.save();
    await logActivity(req.user._id, 'UPLOAD_REQUIREMENT', `Uploaded requirement: ${requirement.label}`);

    res.redirect('/student/requirements?success=Requirement uploaded successfully');
  } catch (error) {
    console.error('Requirement upload error:', error);
    res.redirect('/student/requirements?error=Error uploading requirement');
  }
});

// Requirements Tracker - Delete
router.post('/requirements/delete/:id', isVerified, async (req, res) => {
  try {
    const file = await RepositoryFile.findOne({
      _id: req.params.id,
      studentId: req.user._id,
      fileType: { $in: ALL_REQUIREMENT_KEYS }
    });

    if (!file) {
      return res.redirect('/student/requirements?error=Requirement file not found');
    }

    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await RepositoryFile.findByIdAndDelete(req.params.id);
    await logActivity(req.user._id, 'DELETE_REQUIREMENT', `Deleted requirement: ${file.description || file.fileType}`);

    res.redirect('/student/requirements?success=Requirement removed successfully');
  } catch (error) {
    console.error('Requirement delete error:', error);
    res.redirect('/student/requirements?error=Error removing requirement');
  }
});

// Delete File
router.post('/repository/delete/:id', isVerified, async (req, res) => {
  try {
    const file = await RepositoryFile.findOne({
      _id: req.params.id,
      studentId: req.user._id
    });

    if (!file) {
      return res.redirect('/student/repository?error=File not found');
    }

    const fs = require('fs');
    if (fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    await RepositoryFile.findByIdAndDelete(req.params.id);
    await logActivity(req.user._id, 'DELETE_FILE', `Student deleted file: ${file.originalName}`);

    res.redirect('/student/repository?success=File deleted successfully');
  } catch (error) {
    console.error('Delete file error:', error);
    res.redirect('/student/repository?error=Error deleting file');
  }
});

// Announcements
router.get('/announcements', isVerified, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const now = new Date();
    const announcementQuery = {
      isActive: true,
      isArchived: { $ne: true },
      $and: [
        {
          $or: [
            { startDate: null },
            { startDate: { $lte: now } }
          ]
        },
        {
          $or: [
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      ]
    };
    
    const announcements = await Announcement.find(announcementQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('postedBy', 'email');

    const total = await Announcement.countDocuments(announcementQuery);
    const totalPages = Math.ceil(total / limit);

    res.render('student/announcements', {
      title: 'Announcements',
      user: req.user,
      announcements,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Announcements error:', error);
    res.render('error', { error: 'Error loading announcements', title: 'Error' });
  }
});

// MOA Requests - List all requests
router.get('/moa-requests', isVerified, async (req, res) => {
  try {
    const requests = await MOARequest.find({ studentId: req.user._id })
      .sort({ submittedAt: -1 })
      .populate('approvedCompanyId', 'name type address contact');

    res.render('student/moa-requests', {
      title: 'MOA Requests',
      user: req.user,
      requests,
      query: req.query
    });
  } catch (error) {
    console.error('MOA requests list error:', error);
    res.render('error', { error: 'Error loading MOA requests', title: 'Error' });
  }
});

// MOA Request - New Request Form
router.get('/moa-requests/new', isVerified, async (req, res) => {
  try {
    res.render('student/moa-request-form', {
      title: 'New MOA Request',
      user: req.user,
      query: req.query
    });
  } catch (error) {
    console.error('MOA request form error:', error);
    res.render('error', { error: 'Error loading form', title: 'Error' });
  }
});

// MOA Request - Submit Request
router.post('/moa-requests', isVerified, uploadMOARequest.single('moaFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.render('student/moa-request-form', {
        title: 'New MOA Request',
        user: req.user,
        error: 'Please upload a PDF MOA file'
      });
    }

    const { companyName, companyType, companyAddress, companyContact, companyEmail, companyWebsite } = req.body;

    if (!companyName || !companyType || !companyAddress || !companyContact) {
      return res.render('student/moa-request-form', {
        title: 'New MOA Request',
        user: req.user,
        error: 'Please fill in all required fields'
      });
    }

    const moaRequest = new MOARequest({
      studentId: req.user._id,
      companyName: companyName.trim(),
      companyType: companyType,
      companyAddress: companyAddress.trim(),
      companyContact: companyContact.trim(),
      companyEmail: companyEmail ? companyEmail.trim() : '',
      companyWebsite: companyWebsite ? companyWebsite.trim() : '',
      filePath: req.file.path,
      fileName: req.file.filename,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing'
    });

    await moaRequest.save();
    await logActivity(req.user._id, 'SUBMIT_MOA_REQUEST', `Submitted MOA request for ${companyName}`);

    res.redirect('/student/moa-requests?success=MOA request submitted successfully');
  } catch (error) {
    console.error('MOA request submission error:', error);
    res.render('student/moa-request-form', {
      title: 'New MOA Request',
      user: req.user,
      error: 'Error submitting MOA request. Please try again.'
    });
  }
});

module.exports = router;

