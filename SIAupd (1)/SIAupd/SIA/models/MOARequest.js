const mongoose = require('mongoose');

const moaRequestSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Company/Agency Details
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyType: {
    type: String,
    enum: ['company', 'agency'],
    required: true
  },
  companyAddress: {
    type: String,
    required: true,
    trim: true
  },
  companyContact: {
    type: String,
    required: true,
    trim: true
  },
  companyEmail: {
    type: String,
    trim: true
  },
  companyWebsite: {
    type: String,
    trim: true
  },
  // Uploaded MOA PDF
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  // Request Status
  status: {
    type: String,
    enum: ['processing', 'accepted', 'denied', 'for signature'],
    default: 'processing'
  },
  // Coordinator handling
  coordinatorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  coordinatorComment: {
    type: String,
    default: ''
  },
  // Link to approved company if accepted
  approvedCompanyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    default: null
  },
  // Timestamps
  submittedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

moaRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('MOARequest', moaRequestSchema);

