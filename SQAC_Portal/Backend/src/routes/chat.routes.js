const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const chatController = require('../controllers/chat.controller');

/**
 * Chat REST Routes
 * All routes require authentication via verifyToken.
 */

// GET /api/chat/group?before=<timestamp>&limit=50
router.get('/group', verifyToken, chatController.getGroupMessages);

// GET /api/chat/direct/:userId?before=<timestamp>&limit=50
router.get('/direct/:userId', verifyToken, chatController.getDirectMessages);

module.exports = router;
