const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directories exist
const uploadDirs = {
  moa: 'uploads/moa',
  moaRequests: 'uploads/moa-requests',
  repository: 'uploads/repository',
  evaluations: 'uploads/repository/evaluations',
  documentation: 'uploads/repository/documentation',
  other: 'uploads/repository/other',
  studentPhotos: 'uploads/students',
  announcements: 'uploads/announcements',
  resumes: 'uploads/resumes',
  proofPhotos: 'uploads/proof-photos'
};

Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Storage configuration for MOA
const moaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.moa);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `moa-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Storage configuration for MOA Requests
const moaRequestStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.moaRequests);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `moa-request-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Storage configuration for repository files
const repositoryStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const fileType = req.body.fileType || 'other';
    let destination = uploadDirs.repository;
    
    if (fileType === 'evaluation') {
      destination = uploadDirs.evaluations;
    } else if (fileType === 'documentation') {
      destination = uploadDirs.documentation;
    } else {
      destination = uploadDirs.other;
    }
    
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `repo-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Allow PDF, JPG, JPEG, PNG
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, JPEG, and PNG files are allowed.'), false);
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png'];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG and PNG images are allowed.'), false);
  }
};

const makeStudentFileName = (req, file) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
  const base = (req.body && req.body.studentNumber) ? req.body.studentNumber : 'student';
  const safeBase = base.toString().trim().replace(/[^\w.-]/g, '-').toLowerCase();
  return `student-${safeBase}-${uniqueSuffix}${path.extname(file.originalname)}`;
};

const studentPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.studentPhotos);
  },
  filename: (req, file, cb) => {
    cb(null, makeStudentFileName(req, file));
  }
});

// Storage configuration for announcement images
const announcementImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.announcements);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `announcement-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Multer configurations
exports.uploadMOA = multer({
  storage: moaStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

exports.uploadRepository = multer({
  storage: repositoryStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

exports.uploadStudentPhoto = multer({
  storage: studentPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// PDF only filter for MOA requests
const pdfFileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF files are allowed for MOA requests.'), false);
  }
};

exports.uploadMOARequest = multer({
  storage: moaRequestStorage,
  fileFilter: pdfFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

exports.uploadAnnouncementImage = multer({
  storage: announcementImageStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Storage configuration for resumes
const resumeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.resumes);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `resume-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

// Storage configuration for proof photos
const proofPhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirs.proofPhotos);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `proof-${req.user._id}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

exports.uploadResume = multer({
  storage: resumeStorage,
  fileFilter: fileFilter, // PDF, JPG, JPEG, PNG
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

exports.uploadProofPhotos = multer({
  storage: proofPhotoStorage,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per photo
    files: 10 // Allow up to 10 photos
  }
});

