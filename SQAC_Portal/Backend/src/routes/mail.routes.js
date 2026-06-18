const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const mailController = require('../controllers/mail.controller');

/**
 * Mail Routes
 * Only board members can send mass emails.
 */

// POST /api/mail/send
router.post('/send', verifyToken, requireRole('board'), mailController.sendMail);

module.exports = router;
