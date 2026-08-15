const express = require('express');
const router = express.Router();
const uploadMiddleware = require('../middleware/uploadMiddleware');
const {
  registerTeam,
  getTeamStatus,
  downloadPptTemplate,
  downloadTeamPpt
} = require('../controllers/teamController');

const adminController = require('../controllers/adminController');
const { registerLimiter, statusCheckLimiter } = require('../middleware/rateLimiter');

// Registration submission
router.post('/register', registerLimiter, uploadMiddleware, registerTeam);

// Status check query
router.get('/status', statusCheckLimiter, getTeamStatus);

// PPT template download
router.get('/template', downloadPptTemplate);

// Team PPT file download
router.get('/:id/download-ppt', downloadTeamPpt);

// Public Registration status check
router.get('/registration-status', adminController.getRegistrationStatus);

module.exports = router;
