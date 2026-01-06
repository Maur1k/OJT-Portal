const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// Verify JWT token
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.redirect('/auth/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ojt_portal_secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.redirect('/auth/login');
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.redirect('/auth/login');
  }
};

// Check if user is authenticated (for API routes)
exports.isAuthenticated = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'ojt_portal_secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).render('error', {
        error: 'Access denied. You do not have permission to access this resource.',
        title: 'Access Denied'
      });
    }
    
    next();
  };
};

// Check if user is verified (for students)
exports.isVerified = async (req, res, next) => {
  if (req.user.role === 'student' && !req.user.isVerified) {
    return res.render('student/verification-pending', {
      title: 'Account Verification Pending',
      user: req.user
    });
  }
  next();
};

// Activity logging middleware
exports.logActivity = async (userId, action, description, targetUserId = null, metadata = {}) => {
  try {
    await ActivityLog.create({
      userId,
      action,
      description,
      targetUserId,
      metadata
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
};

