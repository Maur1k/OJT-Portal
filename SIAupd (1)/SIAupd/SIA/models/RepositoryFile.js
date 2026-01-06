const mongoose = require('mongoose');

const repositoryFileSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
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
  fileType: {
    type: String,
    enum: [
      'evaluation',
      'documentation',
      'other',
      'pre_application',
      'pre_units_cert',
      'pre_consent',
      'pre_endorsement',
      'pre_resume',
      'pre_release',
      'pre_time_frame',
      'pre_record',
      'post_internship_evaluation',
      'post_practicum_weekly_report',
      'post_student_feedback',
      'post_supervisor_feedback',
      'post_partner_self_ratee',
      'post_partner_student',
      'legal_internship_agreement',
      'legal_memorandum_of_agreement',
      'legal_training_waiver'
    ],
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RepositoryFile', repositoryFileSchema);

