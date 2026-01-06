const mongoose = require('mongoose');

const studentProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  studentNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  middleName: {
    type: String,
    trim: true
  },
  course: {
    type: String,
    required: true,
    trim: true
  },
  yearLevel: {
    type: String,
    required: true,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year']
  },
  section: {
    type: String,
    trim: true
  },
  contactNumber: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: [
      'For Signature',
      'Approve',
      'Processing'
    ],
    default: 'Processing'
  },
  profilePhoto: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    relationship: String,
    contactNumber: String
  },
  // Company information (optional - can be added later)
  companyName: {
    type: String,
    trim: true
  },
  companyAddress: {
    type: String,
    trim: true
  },
  companyContact: {
    type: String,
    trim: true
  },
  supervisorName: {
    type: String,
    trim: true
  },
  supervisorPosition: {
    type: String,
    trim: true
  },
  supervisorEmail: {
    type: String,
    trim: true
  },
  supervisorContact: {
    type: String,
    trim: true
  },
  ojtStartDate: {
    type: Date
  },
  ojtEndDate: {
    type: Date
  },
  // New fields: Resume, Narrative, Proof Photos
  resumePath: {
    type: String,
    trim: true
  },
  narrative: {
    type: String,
    trim: true
  },
  proofPhotos: [{
    type: String,
    trim: true
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

studentProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('StudentProfile', studentProfileSchema);

