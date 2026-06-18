import express from 'express';
import { verifyToken } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import * as certController from '../controllers/certificate.controller.js';

const router = express.Router();

/**
 * Certificate Routes
 */



// GET /api/certificate/my — logged-in user's own certificates
router.get('/my', verifyToken, certController.getMyCertificates);

// GET /api/certificate/user/:userId — board or domain_lead only
router.get(
  '/user/:userId',
  verifyToken,
  //requireRole('board', 'domain_lead'),
  certController.getUserCertificates
);

// GET /api/certificate/verify/:credentialId — Public
router.get('/verify/:credentialId', certController.verifyCertificate);

// POST /api/certificate/upload-generated — Board, domain_lead, or Admin
router.post(
  '/upload-generated',
  verifyToken,
  //requireRole('admin', 'board', 'domain_lead', 'secretary', 'joint sec', 'technical lead', 'project lead', 'corporate lead'),
  certController.uploadGenerated
);

export default router;
