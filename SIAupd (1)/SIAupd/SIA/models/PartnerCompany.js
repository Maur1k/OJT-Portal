const mongoose = require('mongoose');

const partnerCompanySchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '', trim: true },
  type: { type: String, default: '', trim: true },
  location: { type: String, default: '', trim: true },
  website: { type: String, default: '', trim: true },
  notes: { type: String, default: '', trim: true },
  // Department/Course filter - array of courses that can apply
  availableForCourses: [{ type: String, trim: true }]
}, {
  collection: 'psu_partnered_companies',
  timestamps: true
});

module.exports = mongoose.model('PartnerCompany', partnerCompanySchema);


