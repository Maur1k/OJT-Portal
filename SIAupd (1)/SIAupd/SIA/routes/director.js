const express = require('express');
const router = express.Router();
const { verifyToken, logActivity } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const MOA = require('../models/MOA');
const MOARequest = require('../models/MOARequest');
const CompanyApplication = require('../models/CompanyApplication');
const Company = require('../models/Company');
const PartnerCompany = require('../models/PartnerCompany');
const RepositoryFile = require('../models/RepositoryFile');
const Announcement = require('../models/Announcement');
const fs = require('fs');
const path = require('path');

const STUDENT_STATUS_OPTIONS = [
  'For Signature',
  'Approve',
  'Processing'
];

// Apply authentication and role check
router.use(verifyToken);
router.use(authorize('director'));

// Director Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const verifiedStudents = await User.countDocuments({ role: 'student', isVerified: true });
    const pendingSignatures = await MOA.countDocuments({ status: 'for signature' });
    const completedMOAs = await MOA.countDocuments({ status: 'completed' });
    const totalMOAs = await MOA.countDocuments({});
    
    const recentSignatures = await MOA.find({ status: 'completed' })
      .sort({ signedAt: -1 })
      .limit(5)
      .populate('studentId', 'email')
      .populate('directorId', 'email');

    res.render('director/dashboard', {
      title: 'Director Dashboard',
      user: req.user,
      verifiedStudents,
      pendingSignatures,
      completedMOAs,
      totalMOAs,
      recentSignatures,
      query: req.query
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { error: 'Error loading dashboard', title: 'Error' });
  }
});

// View Verified Students
router.get('/students', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    let query = { role: 'student', isVerified: true };

    if (search) {
      const profiles = await StudentProfile.find({
        $or: [
          { studentNumber: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { course: { $regex: search, $options: 'i' } }
        ]
      }).select('userId');
      
      query._id = { $in: profiles.map(p => p.userId) };
    }

    const students = await User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('email createdAt isVerified verifiedAt');

    const total = await User.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get profiles for students
    const studentIds = students.map(s => s._id);
    const profiles = await StudentProfile.find({ userId: { $in: studentIds } });
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId.toString()] = p;
    });

    res.render('director/students', {
      title: 'Verified Students',
      user: req.user,
      students: students.map(s => ({
        ...s.toObject(),
        profile: profileMap[s._id.toString()]
      })),
      currentPage: page,
      totalPages,
      search,
      statusOptions: STUDENT_STATUS_OPTIONS
    });
  } catch (error) {
    console.error('Students list error:', error);
    res.render('error', { error: 'Error loading students', title: 'Error' });
  }
});

// View Student Details
router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student' || !student.isVerified) {
      return res.render('error', { error: 'Student not found or not verified', title: 'Error' });
    }

    const profile = await StudentProfile.findOne({ userId: student._id });
    const moa = await MOA.findOne({ studentId: student._id });
    const fileCount = await RepositoryFile.countDocuments({ studentId: student._id });

    res.render('director/student-detail', {
      title: 'Student Details',
      user: req.user,
      student,
      profile,
      moa,
      fileCount,
      query: req.query,
      statusOptions: STUDENT_STATUS_OPTIONS
    });
  } catch (error) {
    console.error('Student detail error:', error);
    res.render('error', { error: 'Error loading student details', title: 'Error' });
  }
});

// Update student status
router.post('/students/:id/status', [
  body('status').isIn(STUDENT_STATUS_OPTIONS)
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/director/students/${req.params.id}?error=Invalid status selected`);
    }

    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student' || !student.isVerified) {
      return res.redirect('/director/students?error=Student not found or not verified');
    }

    const profile = await StudentProfile.findOne({ userId: student._id });
    if (!profile) {
      return res.redirect(`/director/students/${req.params.id}?error=Student profile not found`);
    }

    profile.status = req.body.status;
    await profile.save();

    await logActivity(
      req.user._id,
      'UPDATE_STUDENT_STATUS',
      `Updated student status to: ${req.body.status}`,
      student._id
    );

    res.redirect(`/director/students/${req.params.id}?success=Status updated successfully`);
  } catch (error) {
    console.error('Update student status error:', error);
    res.redirect(`/director/students/${req.params.id}?error=Error updating student status`);
  }
});

// View Student Repository
router.get('/students/:id/repository', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student' || !student.isVerified) {
      return res.render('error', { error: 'Student not found or not verified', title: 'Error' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const fileType = req.query.fileType || 'all';
    const search = req.query.search || '';

    let query = { studentId: student._id };
    
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

    const profile = await StudentProfile.findOne({ userId: student._id });

    res.render('director/repository', {
      title: 'Student Repository',
      user: req.user,
      student,
      profile,
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

// MOA for Signature
router.get('/moa', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const courseFilter = req.query.course || 'all';

    let query = { status: 'for signature' };

    let moas = await MOA.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'email');

    // Filter by search if provided
    if (search) {
      const studentIds = await User.find({
        role: 'student',
        isVerified: true,
        email: { $regex: search, $options: 'i' }
      }).select('_id');
      
      const profileIds = await StudentProfile.find({
        $or: [
          { studentNumber: { $regex: search, $options: 'i' } },
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } }
        ]
      }).select('userId');
      
      const allIds = [...studentIds.map(s => s._id), ...profileIds.map(p => p.userId)];
      moas = moas.filter(m => allIds.some(id => id.toString() === m.studentId._id.toString()));
    }

    // Filter by course
    if (courseFilter !== 'all') {
      const courseProfiles = await StudentProfile.find({ course: courseFilter }).select('userId');
      const courseIds = new Set(courseProfiles.map(p => p.userId.toString()));
      moas = moas.filter(m => courseIds.has(m.studentId._id.toString()));
    }

    const total = await MOA.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get profiles for students
    const studentIds = moas.map(m => m.studentId._id);
    const profiles = await StudentProfile.find({ userId: { $in: studentIds } });
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId.toString()] = p;
    });

    // All courses for filter
    const courses = await StudentProfile.distinct('course');
    courses.sort();

    res.render('director/moa', {
      title: 'MOA for Signature',
      user: req.user,
      moas: moas.map(m => ({
        ...m.toObject(),
        profile: profileMap[m.studentId._id.toString()]
      })),
      currentPage: page,
      totalPages,
      search,
      course: courseFilter,
      courses,
      query: req.query
    });
  } catch (error) {
    console.error('MOA list error:', error);
    res.render('error', { error: 'Error loading MOA list', title: 'Error' });
  }
});

// Sign MOA (Final Approval)
router.post('/moa/:id/sign', async (req, res) => {
  try {
    const moa = await MOA.findById(req.params.id);
    if (!moa) {
      return res.redirect('/director/moa?error=MOA not found');
    }

    if (moa.status !== 'for signature') {
      return res.redirect('/director/moa?error=MOA is not ready for signature');
    }

    moa.status = 'completed';
    moa.directorId = req.user._id;
    moa.signedAt = Date.now();
    await moa.save();

    await logActivity(req.user._id, 'SIGN_MOA', 'Signed MOA (final approval)', moa.studentId);
    res.redirect('/director/moa?success=MOA signed successfully');
  } catch (error) {
    console.error('Sign MOA error:', error);
    res.redirect('/director/moa?error=Error signing MOA');
  }
});

// View Repository File
router.get('/students/:studentId/repository/files/:fileId/view', async (req, res) => {
  try {
    const file = await RepositoryFile.findOne({
      _id: req.params.fileId,
      studentId: req.params.studentId
    });

    if (!file) {
      return res.status(404).send('File not found');
    }

    const filePath = path.join(__dirname, '..', file.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).send('File not found on server');
    }

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('View repository file error:', error);
    res.status(500).send('Error viewing file');
  }
});

// Companies Management
router.get('/companies', async (req, res) => {
  try {
    const search = req.query.search ? req.query.search.trim() : '';
    const statusFilter = req.query.status || 'all';
    const typeFilter = req.query.type || 'all';

    const query = {};
    if (statusFilter !== 'all') {
      query.status = statusFilter;
    }
    if (typeFilter !== 'all') {
      query.companyType = typeFilter;
    }
    if (search) {
      query.companyName = { $regex: search, $options: 'i' };
    }

    const applications = await CompanyApplication.find(query)
      .sort({ appliedAt: -1 })
      .populate('studentId', 'email');

    const studentIds = applications
      .map(r => r.studentId?._id)
      .filter(id => id instanceof mongoose.Types.ObjectId);

    const profiles = await StudentProfile.find({ userId: { $in: studentIds } })
      .select('userId firstName lastName middleName studentNumber course section');

    const profileMap = {};
    profiles.forEach(profile => {
      profileMap[profile.userId.toString()] = profile;
    });

    const companyIds = applications
      .map(app => app.companyId)
      .filter(id => id instanceof mongoose.Types.ObjectId);
    const companiesDocs = await Company.find({ _id: { $in: companyIds } });
    const companyMap = {};
    companiesDocs.forEach(c => {
      companyMap[c._id.toString()] = c;
    });

    const groupedCompanies = {};

    applications.forEach(app => {
      const companyDoc = app.companyId ? companyMap[app.companyId.toString()] : null;
      const companyKey = app.companyId
        ? app.companyId.toString()
        : `${app.companyName.toLowerCase()}|${app.companyType}`;

      if (!groupedCompanies[companyKey]) {
        groupedCompanies[companyKey] = {
          companyId: app.companyId || null,
          companyName: companyDoc ? companyDoc.name : app.companyName,
          companyType: companyDoc ? companyDoc.type : app.companyType,
          address: companyDoc ? companyDoc.address : '',
          contact: companyDoc ? companyDoc.contact : '',
          email: companyDoc ? companyDoc.email : '',
          website: companyDoc ? companyDoc.website : '',
          applications: [],
          statusCounts: { pending: 0, accepted: 0, rejected: 0 },
          lastAppliedAt: app.appliedAt
        };
      }

      const profile = app.studentId
        ? profileMap[app.studentId._id.toString()]
        : null;

      groupedCompanies[companyKey].applications.push({
        applicationId: app._id,
        status: app.status,
        submittedAt: app.appliedAt,
        studentEmail: app.studentId ? app.studentId.email : 'N/A',
        profile
      });

      groupedCompanies[companyKey].statusCounts[app.status] =
        (groupedCompanies[companyKey].statusCounts[app.status] || 0) + 1;

      if (app.appliedAt && app.appliedAt > groupedCompanies[companyKey].lastAppliedAt) {
        groupedCompanies[companyKey].lastAppliedAt = app.appliedAt;
      }
    });

    // Calculate accepted count (slots filled) and add slot limit
    const companies = Object.values(groupedCompanies).map(company => {
      const acceptedCount = company.statusCounts.accepted || 0;
      const slotLimit = 50;
      return {
        ...company,
        acceptedCount,
        slotLimit,
        slotsRemaining: slotLimit - acceptedCount,
        isFull: acceptedCount >= slotLimit
      };
    }).sort((a, b) => a.companyName.localeCompare(b.companyName));

    res.render('director/companies', {
      title: 'Companies Applied',
      user: req.user,
      companies,
      search,
      status: statusFilter,
      type: typeFilter,
      query: req.query
    });
  } catch (error) {
    console.error('Companies list error:', error);
    res.render('error', { error: 'Error loading company applications', title: 'Error' });
  }
});

// Add Company - Form
router.get('/companies/create', (req, res) => {
  res.render('director/company-form', {
    title: 'Add Company',
    user: req.user,
    company: null,
    error: null
  });
});

// Create Company
router.post('/companies', [
  body('name').notEmpty().trim().withMessage('Company name is required'),
  body('type').isIn(['company', 'agency']).withMessage('Invalid company type'),
  body('address').notEmpty().trim().withMessage('Address is required'),
  body('contact').notEmpty().trim().withMessage('Contact is required'),
  body('email').optional().isEmail().normalizeEmail(),
  body('website').optional().isURL().withMessage('Invalid website URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('director/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: errors.array()[0].msg || 'Please fill in all required fields correctly'
      });
    }

    // Check if company with same name already exists
    const existingCompany = await Company.findOne({ name: req.body.name.trim() });
    if (existingCompany) {
      return res.render('director/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: 'A company with this name already exists'
      });
    }

    const company = new Company({
      name: req.body.name.trim(),
      type: req.body.type,
      address: req.body.address.trim(),
      contact: req.body.contact.trim(),
      email: req.body.email ? req.body.email.trim() : '',
      website: req.body.website ? req.body.website.trim() : '',
      approvedBy: req.user._id,
      students: []
    });

    await company.save();
    await logActivity(req.user._id, 'CREATE_COMPANY', `Created company: ${company.name}`, null, {
      companyId: company._id,
      companyName: company.name
    });

    res.redirect('/director/companies?success=Company added successfully');
  } catch (error) {
    console.error('Create company error:', error);
    if (error.code === 11000) {
      return res.render('director/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: 'A company with this name already exists'
      });
    }
    res.render('director/company-form', {
      title: 'Add Company',
      user: req.user,
      company: null,
      error: 'Error creating company. Please try again.'
    });
  }
});

// Company detail with applicant list
router.get('/companies/:id', async (req, res) => {
  try {
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);

    // First, try to find the company directly (matching student route logic)
    let company = null;
    if (rawId !== 'example' && isObjectId) {
      company = await Company.findById(rawId);
      if (!company) {
        const partnerCompany = await PartnerCompany.findById(rawId);
        if (partnerCompany) {
          company = {
            ...partnerCompany.toObject(),
            address: partnerCompany.location,
            contact: partnerCompany.contact || '',
            email: partnerCompany.email || '',
            description: partnerCompany.description || '',
            notes: partnerCompany.notes || ''
          };
        }
      }
    }

    // If company found, get applications for this company
    let applications = [];
    if (company) {
      const filter = { companyId: company._id };
      applications = await CompanyApplication.find(filter)
        .sort({ appliedAt: -1 })
        .populate('studentId', 'email');
    } else {
      // If company not found, try to find by company name from applications
      const filter = isObjectId
        ? { companyId: rawId }
        : { companyName: decodeURIComponent(rawId) };
      
      applications = await CompanyApplication.find(filter)
        .sort({ appliedAt: -1 })
        .populate('studentId', 'email');

      // If we have applications, try to find company by companyId from first application
      if (applications.length > 0) {
        const firstApp = applications[0];
        if (firstApp.companyId) {
          company = await Company.findById(firstApp.companyId);
          if (!company) {
            const partnerCompany = await PartnerCompany.findById(firstApp.companyId);
            if (partnerCompany) {
              company = {
                ...partnerCompany.toObject(),
                address: partnerCompany.location,
                contact: partnerCompany.contact || '',
                email: partnerCompany.email || '',
                description: partnerCompany.description || '',
                notes: partnerCompany.notes || ''
              };
            }
          }
        }
      }
    }

    // If still no company found, create fallback from application data
    if (!company && applications.length > 0) {
      const firstApp = applications[0];
      company = {
        _id: firstApp.companyId || null,
        name: firstApp.companyName,
        type: firstApp.companyType || 'company',
        address: '',
        contact: '',
        email: '',
        website: '',
        description: '',
        notes: ''
      };
    } else if (!company) {
      return res.render('error', { error: 'Company not found', title: 'Error' });
    }

    // Convert to plain object if it's a Mongoose document
    if (company && company.toObject) {
      company = company.toObject();
    }

    // Get student profiles for applications
    const studentIds = applications
      .map(app => app.studentId?._id)
      .filter(id => id instanceof mongoose.Types.ObjectId);

    const profiles = await StudentProfile.find({ userId: { $in: studentIds } })
      .select('userId firstName lastName middleName studentNumber course section');
    const profileMap = {};
    profiles.forEach(profile => {
      profileMap[profile.userId.toString()] = profile;
    });

    const applicationsView = applications.map(app => ({
      ...app.toObject(),
      profile: app.studentId ? profileMap[app.studentId._id.toString()] : null
    }));

    res.render('director/company-detail', {
      title: 'Company Applications',
      user: req.user,
      company: company,
      applications: applicationsView,
      query: req.query
    });
  } catch (error) {
    console.error('Company detail error:', error);
    res.render('error', { error: 'Error loading company applications', title: 'Error' });
  }
});

// Edit Application Status - Form
router.get('/companies/:companyId/applications/:applicationId/edit', async (req, res) => {
  try {
    const application = await CompanyApplication.findById(req.params.applicationId)
      .populate('studentId', 'email');

    if (!application) {
      return res.redirect('/director/companies?error=Application not found');
    }

    const profile = await StudentProfile.findOne({ userId: application.studentId._id });

    res.render('director/company-application-edit', {
      title: 'Update Application Status',
      user: req.user,
      companyId: req.params.companyId,
      application,
      profile,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Edit application error:', error);
    res.redirect('/director/companies?error=Error loading application');
  }
});

// Update Application Status
router.post('/companies/:companyId/applications/:applicationId', [
  body('status').isIn(['accepted', 'rejected']),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/director/companies/${req.params.companyId}/applications/${req.params.applicationId}/edit?error=Invalid status`);
    }

    const application = await CompanyApplication.findById(req.params.applicationId);
    if (!application) {
      return res.redirect('/director/companies?error=Application not found');
    }

    const oldStatus = application.status;
    application.status = req.body.status;
    application.notes = req.body.comment || '';
    application.reviewedAt = Date.now();
    application.reviewerId = req.user._id;

    // If accepting, cancel all other pending applications for this student
    let cancelledCount = 0;
    if (req.body.status === 'accepted') {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await application.save({ session });
          
          const cancelled = await CompanyApplication.updateMany(
            {
              studentId: application.studentId,
              _id: { $ne: application._id },
              status: 'pending'
            },
            {
              $set: {
                status: 'cancelled',
                reviewedAt: Date.now(),
                reviewerId: req.user._id,
                notes: 'Automatically cancelled: Student accepted for another company'
              }
            },
            { session }
          );
          cancelledCount = cancelled.modifiedCount;
        });
      } catch (error) {
        console.error('Transaction error:', error);
        // Fallback: try without transaction
        await application.save();
        const cancelled = await CompanyApplication.updateMany(
          {
            studentId: application.studentId,
            _id: { $ne: application._id },
            status: 'pending'
          },
          {
            $set: {
              status: 'cancelled',
              reviewedAt: Date.now(),
              reviewerId: req.user._id,
              notes: 'Automatically cancelled: Student accepted for another company'
            }
          }
        );
        cancelledCount = cancelled.modifiedCount;
      } finally {
        await session.endSession();
      }
    } else {
      await application.save();
    }

    const updatedApplication = await CompanyApplication.findById(req.params.applicationId)
      .populate('studentId', 'email');

    // Notify student via activity log
    if (req.body.status === 'accepted') {
      await logActivity(
        updatedApplication.studentId,
        'COMPANY_APPLICATION_STATUS',
        `Your application to ${updatedApplication.companyName} was accepted. ${cancelledCount ? cancelledCount + ' other pending application(s) were cancelled.' : ''}${req.body.comment ? ' Comment: ' + req.body.comment : ''}`,
        req.user._id,
        {
          companyId: updatedApplication.companyId,
          status: req.body.status,
          comment: req.body.comment || '',
          cancelledOthers: cancelledCount
        }
      );
    } else {
      const commentMsg = req.body.comment ? ` Comment: ${req.body.comment}` : '';
      await logActivity(updatedApplication.studentId, 'COMPANY_APPLICATION_STATUS', `Your application to ${updatedApplication.companyName} was ${req.body.status}.${commentMsg ? commentMsg : ''}`, req.user._id, {
        companyId: updatedApplication.companyId,
        status: req.body.status,
        comment: req.body.comment || ''
      });
    }

    res.redirect(`/director/companies/${req.params.companyId}?success=Application status updated`);
  } catch (error) {
    console.error('Company application update error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Unknown error occurred';
    res.redirect(`/director/companies/${req.params.companyId}/applications/${req.params.applicationId}/edit?error=${encodeURIComponent('Error updating status: ' + errorMessage)}`);
  }
});

// MOA Requests Management
router.get('/moa-requests', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';
    const search = req.query.search || '';

    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }

    let requests = await MOARequest.find(query)
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'email');

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      requests = requests.filter(req => {
        const emailMatch = req.studentId && req.studentId.email && req.studentId.email.toLowerCase().includes(searchLower);
        const companyMatch = req.companyName && req.companyName.toLowerCase().includes(searchLower);
        return emailMatch || companyMatch;
      });
    }

    const total = await MOARequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get profiles for students
    const studentIds = requests.map(r => r.studentId?._id).filter(id => id);
    const profiles = await StudentProfile.find({ userId: { $in: studentIds } });
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId.toString()] = p;
    });

    res.render('director/moa-requests', {
      title: 'MOA Requests Management',
      user: req.user,
      requests: requests.map(r => ({
        ...r.toObject(),
        profile: profileMap[r.studentId._id.toString()]
      })),
      currentPage: page,
      totalPages,
      search,
      status,
      query: req.query
    });
  } catch (error) {
    console.error('MOA requests list error:', error);
    res.render('error', { error: 'Error loading MOA requests', title: 'Error' });
  }
});

// View MOA Request Details
router.get('/moa-requests/:id', async (req, res) => {
  try {
    const request = await MOARequest.findById(req.params.id)
      .populate('studentId', 'email')
      .populate('coordinatorId', 'email')
      .populate('approvedCompanyId');

    if (!request) {
      return res.render('error', { error: 'MOA request not found', title: 'Error' });
    }

    const profile = await StudentProfile.findOne({ userId: request.studentId._id });

    res.render('director/moa-request-detail', {
      title: 'MOA Request Details',
      user: req.user,
      request,
      profile,
      query: req.query
    });
  } catch (error) {
    console.error('MOA request detail error:', error);
    res.render('error', { error: 'Error loading MOA request details', title: 'Error' });
  }
});

// Update MOA Request Status
router.post('/moa-requests/:id/status', [
  body('status').isIn(['processing', 'accepted', 'denied', 'for signature']),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/director/moa-requests?error=Invalid status');
    }

    const moaRequest = await MOARequest.findById(req.params.id);
    if (!moaRequest) {
      return res.redirect('/director/moa-requests?error=MOA request not found');
    }

    const oldStatus = moaRequest.status;
    moaRequest.status = req.body.status;
    moaRequest.coordinatorComment = req.body.comment || '';
    moaRequest.coordinatorId = req.user._id;
    moaRequest.reviewedAt = Date.now();

    // If accepted or for signature, create or update company and link student
    if (req.body.status === 'accepted' || req.body.status === 'for signature') {
      let company = await Company.findOne({ name: moaRequest.companyName });
      
      if (!company) {
        // Create new company
        company = new Company({
          name: moaRequest.companyName,
          type: moaRequest.companyType,
          address: moaRequest.companyAddress,
          contact: moaRequest.companyContact,
          email: moaRequest.companyEmail || '',
          website: moaRequest.companyWebsite || '',
          approvedBy: req.user._id,
          students: [moaRequest.studentId]
        });
      } else {
        // Add student to existing company if not already there
        if (!company.students.includes(moaRequest.studentId)) {
          company.students.push(moaRequest.studentId);
        }
      }
      
      await company.save();
      moaRequest.approvedCompanyId = company._id;

      // Promote the uploaded MOA request file into MOA Management (when accepted or for signature)
      const existingMoa = await MOA.findOne({ studentId: moaRequest.studentId });
      if (existingMoa) {
        existingMoa.filePath = moaRequest.filePath;
        existingMoa.fileName = moaRequest.fileName;
        existingMoa.fileSize = moaRequest.fileSize;
        existingMoa.mimeType = moaRequest.mimeType;
        // Set MOA status based on request status
        if (req.body.status === 'for signature') {
          existingMoa.status = 'for signature';
        } else {
          existingMoa.status = existingMoa.status || 'processing';
        }
        existingMoa.coordinatorComment = moaRequest.coordinatorComment || existingMoa.coordinatorComment;
        existingMoa.coordinatorId = req.user._id;
        await existingMoa.save();
      } else {
        const newMoa = new MOA({
          studentId: moaRequest.studentId,
          filePath: moaRequest.filePath,
          fileName: moaRequest.fileName,
          fileSize: moaRequest.fileSize,
          mimeType: moaRequest.mimeType,
          status: req.body.status === 'for signature' ? 'for signature' : 'processing',
          coordinatorComment: moaRequest.coordinatorComment || '',
          coordinatorId: req.user._id
        });
        await newMoa.save();
      }
    }

    await moaRequest.save();
    await logActivity(req.user._id, 'UPDATE_MOA_REQUEST_STATUS', `Updated MOA request status from ${oldStatus} to ${req.body.status}`, moaRequest.studentId);

    res.redirect(`/director/moa-requests/${req.params.id}?success=MOA request status updated successfully`);
  } catch (error) {
    console.error('Update MOA request status error:', error);
    res.redirect('/director/moa-requests?error=Error updating MOA request status');
  }
});

module.exports = router;

