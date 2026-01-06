const express = require('express');
const router = express.Router();
const { verifyToken, logActivity } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const MOA = require('../models/MOA');
const MOARequest = require('../models/MOARequest');
const CompanyApplication = require('../models/CompanyApplication');
const Company = require('../models/Company');
const PartnerCompany = require('../models/PartnerCompany');
const RepositoryFile = require('../models/RepositoryFile');
const Announcement = require('../models/Announcement');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { uploadAnnouncementImage } = require('../middleware/upload');

// Apply authentication and role check
router.use(verifyToken);
router.use(authorize('coordinator'));

// Coordinator Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const verifiedStudents = await User.countDocuments({ role: 'student', isVerified: true });
    const pendingVerification = await User.countDocuments({ role: 'student', isVerified: false });
    
    // Get MOA stats - ensure exact status matching
    const moaStats = {
      processing: await MOA.countDocuments({ status: 'processing' }),
      revise: await MOA.countDocuments({ status: 'revise' }),
      forSignature: await MOA.countDocuments({ status: 'for signature' }),
      completed: await MOA.countDocuments({ status: 'completed' })
    };

    const moaRequestStats = {
      processing: await MOARequest.countDocuments({ status: 'processing' }),
      accepted: await MOARequest.countDocuments({ status: 'accepted' }),
      denied: await MOARequest.countDocuments({ status: 'denied' })
    };

    const recentStudents = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('email createdAt isVerified');

    res.render('coordinator/dashboard', {
      title: 'Coordinator Dashboard',
      user: req.user,
      totalStudents,
      verifiedStudents,
      pendingVerification,
      moaStats,
      moaRequestStats,
      recentStudents,
      query: req.query
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.render('error', { error: 'Error loading dashboard', title: 'Error' });
  }
});

// Student List
router.get('/students', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all'; // all, verified, pending

    let query = { role: 'student' };
    
    if (filter === 'verified') {
      query.isVerified = true;
    } else if (filter === 'pending') {
      query.isVerified = false;
    }

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

    res.render('coordinator/students', {
      title: 'Student List',
      user: req.user,
      students: students.map(s => ({
        ...s.toObject(),
        profile: profileMap[s._id.toString()]
      })),
      currentPage: page,
      totalPages,
      search,
      filter
    });
  } catch (error) {
    console.error('Students list error:', error);
    res.render('error', { error: 'Error loading students', title: 'Error' });
  }
});

// View Student Profile
router.get('/students/:id', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.render('error', { error: 'Student not found', title: 'Error' });
    }

    const profile = await StudentProfile.findOne({ userId: student._id });
    const moa = await MOA.findOne({ studentId: student._id });
    const fileCount = await RepositoryFile.countDocuments({ studentId: student._id });

    res.render('coordinator/student-detail', {
      title: 'Student Details',
      user: req.user,
      student,
      profile,
      moa,
      fileCount,
      query: req.query
    });
  } catch (error) {
    console.error('Student detail error:', error);
    res.render('error', { error: 'Error loading student details', title: 'Error' });
  }
});

// Verify Student Account
router.post('/students/:id/verify', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.redirect('/coordinator/students?error=Student not found');
    }

    student.isVerified = true;
    student.verifiedBy = req.user._id;
    student.verifiedAt = Date.now();
    await student.save();

    await logActivity(req.user._id, 'VERIFY_STUDENT', `Verified student account: ${student.email}`, student._id);
    res.redirect(`/coordinator/students/${req.params.id}?success=Student verified successfully`);
  } catch (error) {
    console.error('Verify student error:', error);
    res.redirect(`/coordinator/students/${req.params.id}?error=Error verifying student`);
  }
});

// View Student Repository
router.get('/students/:id/repository', async (req, res) => {
  try {
    const student = await User.findById(req.params.id);
    if (!student || student.role !== 'student') {
      return res.render('error', { error: 'Student not found', title: 'Error' });
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

    res.render('coordinator/repository', {
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

// View Repository File
router.get('/students/:studentId/repository/files/:fileId/view', async (req, res) => {
  try {
    const student = await User.findById(req.params.studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).send('Student not found');
    }

    const file = await RepositoryFile.findOne({
      _id: req.params.fileId,
      studentId: student._id
    });

    if (!file) {
      return res.status(404).send('File not found');
    }

    // Resolve file path (handle both relative and absolute paths)
    let filePath = file.filePath;
    
    // If path doesn't start with uploads/, it might be absolute or need root prepending
    if (!filePath.startsWith('uploads/') && !path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath);
    } else if (!path.isAbsolute(filePath)) {
      filePath = path.join(process.cwd(), filePath);
    }

    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      console.error('File not found at path:', filePath);
      return res.status(404).send('File not found on server');
    }

    // Set appropriate headers for viewing
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.originalName)}"`);
    
    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('View file error:', error);
    res.status(500).send('Error viewing file');
  }
});

// MOA Management
router.get('/moa', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = req.query.status || 'all';
    const search = req.query.search || '';
    const courseFilter = req.query.course || 'all';

    let query = {};
    
    if (status !== 'all') {
      query.status = status;
    }

    let moas = await MOA.find(query)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('studentId', 'email');

    // Filter by search if provided
    if (search) {
      const studentIds = await User.find({
        role: 'student',
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

    res.render('coordinator/moa', {
      title: 'MOA Management',
      user: req.user,
      moas: moas.map(m => ({
        ...m.toObject(),
        profile: profileMap[m.studentId._id.toString()]
      })),
      currentPage: page,
      totalPages,
      status,
      search,
      course: courseFilter,
      courses,
      query: req.query
    });
  } catch (error) {
    console.error('MOA management error:', error);
    res.render('error', { error: 'Error loading MOA list', title: 'Error' });
  }
});


// Update MOA Status
router.post('/moa/:id/status', [
  body('status').isIn(['processing', 'revise', 'for signature']),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect('/coordinator/moa?error=Invalid status');
    }

    const moa = await MOA.findById(req.params.id);
    if (!moa) {
      return res.redirect('/coordinator/moa?error=MOA not found');
    }

    const oldStatus = moa.status;
    moa.status = req.body.status.trim();
    moa.coordinatorComment = req.body.comment || '';
    moa.coordinatorId = req.user._id;
    
    // Save and verify
    const savedMoa = await moa.save();
    
    // Verify the save worked
    if (!savedMoa) {
      throw new Error('Failed to save MOA');
    }

    // Double-check by reloading from database
    const verifyMoa = await MOA.findById(req.params.id);
    if (verifyMoa.status !== req.body.status.trim()) {
      console.error('MOA status mismatch after save. Expected:', req.body.status.trim(), 'Got:', verifyMoa.status);
      throw new Error('MOA status was not updated correctly');
    }

    await logActivity(req.user._id, 'UPDATE_MOA_STATUS', `Updated MOA status from ${oldStatus} to ${req.body.status.trim()}`, moa.studentId);
    res.redirect('/coordinator/moa?success=MOA status updated successfully');
  } catch (error) {
    console.error('Update MOA status error:', error);
    console.error('Error details:', error.message, error.stack);
    res.redirect(`/coordinator/moa?error=${encodeURIComponent('Error updating MOA status: ' + error.message)}`);
  }
});

// Delete MOA
router.post('/moa/:id/delete', async (req, res) => {
  try {
    const moa = await MOA.findById(req.params.id);
    if (!moa) {
      return res.redirect('/coordinator/moa?error=MOA not found');
    }

    // Remove file from disk if exists
    if (moa.filePath && fs.existsSync(moa.filePath)) {
      fs.unlinkSync(moa.filePath);
    }

    await MOA.findByIdAndDelete(req.params.id);
    await logActivity(req.user._id, 'DELETE_MOA', 'Deleted MOA record', moa.studentId);

    res.redirect('/coordinator/moa?success=MOA deleted successfully');
  } catch (error) {
    console.error('Delete MOA error:', error);
    res.redirect('/coordinator/moa?error=Error deleting MOA');
  }
});

// Announcements
router.get('/announcements', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const announcements = await Announcement.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('postedBy', 'email');

    const total = await Announcement.countDocuments();
    const totalPages = Math.ceil(total / limit);

    res.render('coordinator/announcements', {
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

// Create Announcement
router.get('/announcements/create', (req, res) => {
  res.render('coordinator/announcement-form', {
    title: 'Create Announcement',
    user: req.user,
    announcement: null
  });
});

// Post Announcement
router.post('/announcements', uploadAnnouncementImage.single('image'), [
  body('title').notEmpty().trim(),
  body('content').notEmpty().trim(),
  body('type').isIn(['memo', 'update', 'general'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('coordinator/announcement-form', {
        title: 'Create Announcement',
        user: req.user,
        announcement: null,
        error: 'Please fill in all required fields'
      });
    }

    const announcement = new Announcement({
      title: req.body.title,
      content: req.body.content,
      type: req.body.type,
      postedBy: req.user._id,
      startDate: req.body.startDate ? new Date(req.body.startDate) : null,
      endDate: req.body.endDate ? new Date(req.body.endDate) : null
    });

    // Handle image upload if provided
    if (req.file) {
      announcement.imagePath = req.file.path;
    }

    await announcement.save();
    await logActivity(req.user._id, 'CREATE_ANNOUNCEMENT', `Created announcement: ${req.body.title}`);

    res.redirect('/coordinator/announcements?success=Announcement created successfully');
  } catch (error) {
    console.error('Create announcement error:', error);
    res.render('coordinator/announcement-form', {
      title: 'Create Announcement',
      user: req.user,
      announcement: null,
      error: 'Error creating announcement'
    });
  }
});

// Edit Announcement
router.get('/announcements/:id/edit', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.redirect('/coordinator/announcements?error=Announcement not found');
    }

    res.render('coordinator/announcement-form', {
      title: 'Edit Announcement',
      user: req.user,
      announcement
    });
  } catch (error) {
    console.error('Edit announcement error:', error);
    res.redirect('/coordinator/announcements?error=Error loading announcement');
  }
});

// Update Announcement
router.post('/announcements/:id', uploadAnnouncementImage.single('image'), [
  body('title').notEmpty().trim(),
  body('content').notEmpty().trim(),
  body('type').isIn(['memo', 'update', 'general'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/coordinator/announcements/${req.params.id}/edit?error=Invalid data`);
    }

    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.redirect('/coordinator/announcements?error=Announcement not found');
    }

    announcement.title = req.body.title;
    announcement.content = req.body.content;
    announcement.type = req.body.type;
    announcement.startDate = req.body.startDate ? new Date(req.body.startDate) : null;
    announcement.endDate = req.body.endDate ? new Date(req.body.endDate) : null;

    // Handle image upload if provided
    if (req.file) {
      // Delete old image if exists
      if (announcement.imagePath && fs.existsSync(announcement.imagePath)) {
        fs.unlinkSync(announcement.imagePath);
      }
      announcement.imagePath = req.file.path;
    }

    await announcement.save();

    await logActivity(req.user._id, 'UPDATE_ANNOUNCEMENT', `Updated announcement: ${req.body.title}`);
    res.redirect('/coordinator/announcements?success=Announcement updated successfully');
  } catch (error) {
    console.error('Update announcement error:', error);
    res.redirect('/coordinator/announcements?error=Error updating announcement');
  }
});

// Archive Announcement
router.post('/announcements/:id/archive', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.redirect('/coordinator/announcements?error=Announcement not found');
    }

    announcement.isActive = false;
    announcement.isArchived = true;
    await announcement.save();

    await logActivity(req.user._id, 'ARCHIVE_ANNOUNCEMENT', `Archived announcement: ${announcement.title}`);
    res.redirect('/coordinator/announcements?success=' + encodeURIComponent('Announcement archived successfully'));
  } catch (error) {
    console.error('Archive announcement error:', error);
    res.redirect('/coordinator/announcements?error=Error archiving announcement');
  }
});

// Unarchive Announcement
router.post('/announcements/:id/unarchive', async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.redirect('/coordinator/announcements?error=Announcement not found');
    }

    announcement.isActive = true;
    announcement.isArchived = false;
    await announcement.save();

    await logActivity(req.user._id, 'UNARCHIVE_ANNOUNCEMENT', `Unarchived announcement: ${announcement.title}`);
    res.redirect('/coordinator/announcements?success=' + encodeURIComponent('Announcement unarchived successfully'));
  } catch (error) {
    console.error('Unarchive announcement error:', error);
    res.redirect('/coordinator/announcements?error=Error unarchiving announcement');
  }
});

// Add Coordinator Account
router.get('/coordinators/create', (req, res) => {
  res.render('coordinator/coordinator-form', {
    title: 'Add Coordinator',
    user: req.user,
    error: null
  });
});

router.post('/coordinators', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('coordinator/coordinator-form', {
        title: 'Add Coordinator',
        user: req.user,
        error: 'Invalid email or password (min 6 characters)'
      });
    }

    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res.render('coordinator/coordinator-form', {
        title: 'Add Coordinator',
        user: req.user,
        error: 'Email already exists'
      });
    }

    const coordinator = new User({
      email: req.body.email,
      password: req.body.password,
      role: 'coordinator',
      isVerified: true
    });

    await coordinator.save();
    await logActivity(req.user._id, 'CREATE_COORDINATOR', `Created coordinator account: ${req.body.email}`, coordinator._id);

    res.redirect('/coordinator/dashboard?success=Coordinator account created successfully');
  } catch (error) {
    console.error('Create coordinator error:', error);
    res.render('coordinator/coordinator-form', {
      title: 'Add Coordinator',
      user: req.user,
      error: 'Error creating coordinator account'
    });
  }
});

// Companies applied by students (grouped view)
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

    res.render('coordinator/companies', {
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
  res.render('coordinator/company-form', {
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
      return res.render('coordinator/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: errors.array()[0].msg || 'Please fill in all required fields correctly'
      });
    }

    // Check if company with same name already exists
    const existingCompany = await Company.findOne({ name: req.body.name.trim() });
    if (existingCompany) {
      return res.render('coordinator/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: 'A company with this name already exists'
      });
    }

    // Handle availableForCourses - can be string or array from checkboxes
    let availableForCourses = [];
    if (req.body.availableForCourses) {
      availableForCourses = Array.isArray(req.body.availableForCourses) 
        ? req.body.availableForCourses 
        : [req.body.availableForCourses];
    }

    const company = new Company({
      name: req.body.name.trim(),
      type: req.body.type,
      address: req.body.address.trim(),
      contact: req.body.contact.trim(),
      email: req.body.email ? req.body.email.trim() : '',
      website: req.body.website ? req.body.website.trim() : '',
      availableForCourses: availableForCourses,
      approvedBy: req.user._id,
      students: []
    });

    await company.save();
    await logActivity(req.user._id, 'CREATE_COMPANY', `Created company: ${company.name}`, null, {
      companyId: company._id,
      companyName: company.name
    });

    res.redirect('/coordinator/companies?success=Company added successfully');
  } catch (error) {
    console.error('Create company error:', error);
    if (error.code === 11000) {
      return res.render('coordinator/company-form', {
        title: 'Add Company',
        user: req.user,
        company: null,
        error: 'A company with this name already exists'
      });
    }
    res.render('coordinator/company-form', {
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

    res.render('coordinator/company-detail', {
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

// Company application status edit
router.get('/companies/:companyId/applications/:applicationId/edit', async (req, res) => {
  try {
    const application = await CompanyApplication.findById(req.params.applicationId).populate('studentId', 'email');
    if (!application) {
      return res.render('error', { error: 'Application not found', title: 'Error' });
    }

    const profile = application.studentId
      ? await StudentProfile.findOne({ userId: application.studentId._id })
      : null;

    res.render('coordinator/company-application-edit', {
      title: 'Update Application Status',
      user: req.user,
      application,
      profile,
      companyId: req.params.companyId,
      query: req.query
    });
  } catch (error) {
    console.error('Company application edit error:', error);
    res.render('error', { error: 'Error loading application', title: 'Error' });
  }
});

router.post('/companies/:companyId/applications/:applicationId', [
  body('status').isIn(['accepted', 'rejected']),
  body('comment').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.redirect(`/coordinator/companies/${req.params.companyId}/applications/${req.params.applicationId}/edit?error=Invalid status`);
    }

    // Check if application exists
    const application = await CompanyApplication.findById(req.params.applicationId);
    if (!application) {
      return res.redirect(`/coordinator/companies/${req.params.companyId}?error=Application not found`);
    }

    let cancelledCount = 0;

    // Try to use transaction if supported, otherwise fall back to regular operations
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          // Reload application within transaction
          const appInTransaction = await CompanyApplication.findById(req.params.applicationId).session(session);
          if (!appInTransaction) {
            throw new Error('Application not found in transaction');
          }

          appInTransaction.status = req.body.status;
          appInTransaction.notes = req.body.comment || appInTransaction.notes || '';
          appInTransaction.reviewedAt = Date.now();
          appInTransaction.reviewerId = req.user._id;
          await appInTransaction.save({ session });

          // If accepted, auto-cancel other pending applications for the same student
          if (req.body.status === 'accepted') {
            const cancelResult = await CompanyApplication.updateMany(
              {
                studentId: appInTransaction.studentId,
                _id: { $ne: appInTransaction._id },
                status: 'pending'
              },
              {
                $set: {
                  status: 'cancelled',
                  reviewedAt: new Date(),
                  reviewerId: req.user._id,
                  notes: 'Auto-cancelled due to another accepted application'
                }
              },
              { session }
            );
            cancelledCount = cancelResult.modifiedCount || 0;
          }
        });
      } finally {
        await session.endSession();
      }
    } catch (txError) {
      // If transaction fails (e.g., no replica set), fall back to non-transactional approach
      console.warn('Transaction not supported, using fallback:', txError.message);
      
      // Update the application
      application.status = req.body.status;
      application.notes = req.body.comment || application.notes || '';
      application.reviewedAt = Date.now();
      application.reviewerId = req.user._id;
      await application.save();

      // If accepted, auto-cancel other pending applications for the same student
      if (req.body.status === 'accepted') {
        const cancelResult = await CompanyApplication.updateMany(
          {
            studentId: application.studentId,
            _id: { $ne: application._id },
            status: 'pending'
          },
          {
            $set: {
              status: 'cancelled',
              reviewedAt: new Date(),
              reviewerId: req.user._id,
              notes: 'Auto-cancelled due to another accepted application'
            }
          }
        );
        cancelledCount = cancelResult.modifiedCount || 0;
      }
    }

    // Reload application to get updated data
    const updatedApplication = await CompanyApplication.findById(req.params.applicationId);
    if (!updatedApplication) {
      return res.redirect(`/coordinator/companies/${req.params.companyId}?error=Application not found after update`);
    }

    await logActivity(req.user._id, 'UPDATE_COMPANY_APPLICATION_STATUS', `Set application status to ${req.body.status}`, updatedApplication.studentId, {
      companyId: updatedApplication.companyId,
      companyName: updatedApplication.companyName,
      cancelledOthers: cancelledCount
    });

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

    res.redirect(`/coordinator/companies/${req.params.companyId}?success=Application status updated`);
  } catch (error) {
    console.error('Company application update error:', error);
    console.error('Error stack:', error.stack);
    const errorMessage = error.message || 'Unknown error occurred';
    res.redirect(`/coordinator/companies/${req.params.companyId}/applications/${req.params.applicationId}/edit?error=${encodeURIComponent('Error updating status: ' + errorMessage)}`);
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
      .populate('studentId', 'email')
      .populate('approvedCompanyId', 'name type');

    // Filter by search if provided
    if (search) {
      const studentIds = await User.find({
        role: 'student',
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
      requests = requests.filter(r => 
        allIds.some(id => id.toString() === r.studentId._id.toString()) ||
        r.companyName.toLowerCase().includes(search.toLowerCase())
      );
    }

    const total = await MOARequest.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    // Get profiles for students
    const studentIds = requests.map(r => r.studentId._id);
    const profiles = await StudentProfile.find({ userId: { $in: studentIds } });
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.userId.toString()] = p;
    });

    res.render('coordinator/moa-requests', {
      title: 'MOA Requests Management',
      user: req.user,
      requests: requests.map(r => ({
        ...r.toObject(),
        profile: profileMap[r.studentId._id.toString()]
      })),
      currentPage: page,
      totalPages,
      status,
      search,
      query: req.query
    });
  } catch (error) {
    console.error('MOA requests management error:', error);
    res.render('error', { error: 'Error loading MOA requests', title: 'Error' });
  }
});

// View MOA Request Details
router.get('/moa-requests/:id', async (req, res) => {
  try {
    const request = await MOARequest.findById(req.params.id)
      .populate('studentId', 'email')
      .populate('approvedCompanyId', 'name type address contact email website')
      .populate('coordinatorId', 'email');

    if (!request) {
      return res.render('error', { error: 'MOA request not found', title: 'Error' });
    }

    const profile = await StudentProfile.findOne({ userId: request.studentId._id });

    res.render('coordinator/moa-request-detail', {
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
      return res.redirect('/coordinator/moa-requests?error=Invalid status');
    }

    const moaRequest = await MOARequest.findById(req.params.id);
    if (!moaRequest) {
      return res.redirect('/coordinator/moa-requests?error=MOA request not found');
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

    res.redirect(`/coordinator/moa-requests/${req.params.id}?success=MOA request status updated successfully`);
  } catch (error) {
    console.error('Update MOA request status error:', error);
    res.redirect('/coordinator/moa-requests?error=Error updating MOA request status');
  }
});

module.exports = router;

