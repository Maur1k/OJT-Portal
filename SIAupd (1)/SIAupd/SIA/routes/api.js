const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

// Chatbot API endpoint
router.post('/chatbot', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.json({ response: 'Please provide a message.' });
    }

    const lowerMessage = message.toLowerCase().trim();
    let response = '';

    // Simple rule-based FAQ chatbot
    if (lowerMessage.includes('moa') || lowerMessage.includes('memorandum')) {
      if (lowerMessage.includes('upload') || lowerMessage.includes('how')) {
        response = 'To upload your MOA, go to the MOA section in your dashboard and click "Upload MOA". Make sure the file is in PDF or JPG format and does not exceed 10MB.';
      } else if (lowerMessage.includes('status') || lowerMessage.includes('check')) {
        response = 'You can check your MOA status in the MOA section. Statuses include: Processing (under review), Revise (needs revision), For Signature (ready for director approval), and Completed (signed and approved).';
      } else {
        response = 'MOA stands for Memorandum of Agreement. It is a document that formalizes the agreement between the university and the company for your OJT. You need to upload it after registration.';
      }
    } else if (lowerMessage.includes('register') || lowerMessage.includes('sign up') || lowerMessage.includes('account')) {
      response = 'To register, click on the Register button and fill out all required information including your student details and company information. After registration, wait for coordinator verification.';
    } else if (lowerMessage.includes('verify') || lowerMessage.includes('verification')) {
      response = 'After registration, your account needs to be verified by an OJT Coordinator. Once verified, you will be able to access all features of the portal.';
    } else if (lowerMessage.includes('repository') || lowerMessage.includes('upload file') || lowerMessage.includes('document')) {
      response = 'The repository is where you can upload and manage your OJT documents like company evaluations and documentation. Go to the Repository section to upload files.';
    } else if (lowerMessage.includes('profile') || lowerMessage.includes('update')) {
      response = 'You can view and update your profile in the Profile section. Make sure all information is accurate and up-to-date.';
    } else if (lowerMessage.includes('announcement') || lowerMessage.includes('memo') || lowerMessage.includes('update')) {
      response = 'Check the Announcements section to see important memos and updates from the OJT Coordinator.';
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('help')) {
      response = 'Hello! I can help you with questions about MOA, registration, verification, repository, profile, and announcements. What would you like to know?';
    } else if (lowerMessage.includes('contact') || lowerMessage.includes('coordinator') || lowerMessage.includes('support')) {
      response = 'For additional support, please contact your OJT Coordinator. You can find their contact information in the announcements or contact the university directly.';
    } else {
      response = 'I can help you with questions about MOA, registration, verification, repository, profile, and announcements. Please ask a specific question or type "help" for more information.';
    }

    res.json({ response });
  } catch (error) {
    console.error('Chatbot error:', error);
    res.json({ response: 'Sorry, I encountered an error. Please try again later.' });
  }
});

// Get announcements (public API)
router.get('/announcements', async (req, res) => {
  try {
    const Announcement = require('../models/Announcement');
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
      .limit(10)
      .populate('postedBy', 'email')
      .select('title content type createdAt');
    
    res.json({ announcements });
  } catch (error) {
    console.error('Announcements API error:', error);
    res.status(500).json({ error: 'Error fetching announcements' });
  }
});

module.exports = router;

