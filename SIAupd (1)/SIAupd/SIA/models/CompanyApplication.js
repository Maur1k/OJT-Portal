const mongoose = require('mongoose');

const companyApplicationSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  companyType: {
    type: String,
    default: '',
    trim: true
  },
  source: {
    type: String,
    enum: ['company', 'partner'],
    default: 'company'
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'cancelled'],
    default: 'pending'
  },
  notes: {
    type: String,
    default: ''
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  reviewerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true,
  collection: 'company_applications'
});

module.exports = mongoose.model('CompanyApplication', companyApplicationSchema);

