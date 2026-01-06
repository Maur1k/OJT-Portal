const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const StudentProfile = require('../models/StudentProfile');
const { verifyToken } = require('../middleware/auth');
const { logActivity } = require('../middleware/auth');
const { uploadStudentPhoto } = require('../middleware/upload');

const handleStudentPhotoUpload = (req, res, next) => {
  uploadStudentPhoto.single('profilePhoto')(req, res, (err) => {
    if (err) {
      console.error('Profile photo upload error:', err);
      return res.render('auth/register', {
        title: 'Register',
        error: err.message || 'Error uploading profile photo'
      });
    }
    next();
  });
};

// Login page
router.get('/login', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/login', { title: 'Login', error: null });
});

// Register page
router.get('/register', (req, res) => {
  if (req.user) {
    return res.redirect('/');
  }
  res.render('auth/register', { title: 'Register', error: null });
});

// Login handler
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password format'
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login',
        error: 'Invalid email or password'
      });
    }

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'ojt_portal_secret',
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === 'production'
    });

    // Log activity
    await logActivity(user._id, 'LOGIN', 'User logged in');

    // Redirect based on role
    if (user.role === 'student') {
      res.redirect('/student/dashboard');
    } else if (user.role === 'coordinator') {
      res.redirect('/coordinator/dashboard');
    } else if (user.role === 'director') {
      res.redirect('/director/dashboard');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.render('auth/login', {
      title: 'Login',
      error: 'An error occurred. Please try again.'
    });
  }
});

// Register handler
router.post('/register',
handleStudentPhotoUpload,
[
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('studentNumber').notEmpty().trim(),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('course').notEmpty().trim(),
  body('yearLevel').notEmpty(),
  body('contactNumber').notEmpty().trim(),
  body('address').notEmpty().trim()
], async (req, res) => {
  try {
    const removeUploadedPhoto = () => {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) {
            console.error('Failed to remove uploaded profile photo:', err);
          }
        });
      }
    };

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      removeUploadedPhoto();
      return res.render('auth/register', {
        title: 'Register',
        error: 'Please fill in all required fields correctly'
      });
    }

    const {
      email,
      password,
      studentNumber,
      firstName,
      lastName,
      middleName,
      course,
      yearLevel,
      section,
      contactNumber,
      address,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactNumber
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      removeUploadedPhoto();
      return res.render('auth/register', {
        title: 'Register',
        error: 'Email already registered'
      });
    }

    // Check if student number already exists
    const existingProfile = await StudentProfile.findOne({ studentNumber });
    if (existingProfile) {
      removeUploadedPhoto();
      return res.render('auth/register', {
        title: 'Register',
        error: 'Student number already registered'
      });
    }

    // Create user
    const user = new User({
      email,
      password,
      role: 'student',
      isVerified: false
    });
    await user.save();

    // Create student profile
    const profilePhotoPath = req.file ? `/uploads/students/${req.file.filename}` : undefined;

    const profile = new StudentProfile({
      userId: user._id,
      studentNumber,
      firstName,
      lastName,
      middleName,
      course,
      yearLevel,
      section,
      contactNumber,
      address,
      emergencyContact: {
        name: emergencyContactName,
        relationship: emergencyContactRelationship,
        contactNumber: emergencyContactNumber
      },
      profilePhoto: profilePhotoPath
    });
    await profile.save();

    // Log activity
    await logActivity(user._id, 'REGISTER', 'New student account created');

    res.render('auth/register-success', {
      title: 'Registration Successful',
      message: 'Your account has been created. Please wait for coordinator verification before you can access the portal.'
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) {
          console.error('Failed to remove uploaded profile photo after error:', err);
        }
      });
    }
    console.error('Registration error:', error);
    res.render('auth/register', {
      title: 'Register',
      error: 'An error occurred. Please try again.'
    });
  }
});

// Logout handler
router.get('/logout', verifyToken, async (req, res) => {
  try {
    await logActivity(req.user._id, 'LOGOUT', 'User logged out');
    res.clearCookie('token');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Logout error:', error);
    res.clearCookie('token');
    res.redirect('/auth/login');
  }
});

module.exports = router;

