const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Announcement = require('../models/Announcement');

// Home page - redirect based on role
router.get('/', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    
    if (user.role === 'student') {
      return res.redirect('/student/dashboard');
    } else if (user.role === 'coordinator') {
      return res.redirect('/coordinator/dashboard');
    } else if (user.role === 'director') {
      return res.redirect('/director/dashboard');
    }
    
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Home route error:', error);
    res.redirect('/auth/login');
  }
});

// Public landing page
router.get('/home', async (req, res) => {
  try {
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
      .limit(5)
      .populate('postedBy', 'email');
    
    res.render('index', {
      title: 'OJT Management Portal - Pangasinan State University',
      announcements,
      user: null
    });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.render('index', {
      title: 'OJT Management Portal',
      announcements: [],
      user: null
    });
  }
});

module.exports = router;

