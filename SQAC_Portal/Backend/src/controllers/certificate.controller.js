import Certificate from '../models/Certificate.js';
import User from '../models/User.js';
import { supabase } from '../config/supabase.js';
import sendMail from '../lib/mailer.js';
import { certificateIssuedEmail } from '../lib/email-templates.js';

/**
 * GET /api/certificate/my
 * Get logged-in user's own certificates.
 */
export const getMyCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ issuedTo: req.user.userId })
      .sort({ issuedAt: -1 })
      .populate('issuedBy', 'name username')
      .lean();

    res.json({ certificates });
  } catch (err) {
    console.error('getMyCertificates error:', err);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

/**
 * GET /api/certificate/user/:userId
 * Get all certificates for a specific user. Requires board or domain_lead role.
 */
export const getUserCertificates = async (req, res) => {
  try {
    const certificates = await Certificate.find({ issuedTo: req.params.userId })
      .sort({ issuedAt: -1 })
      .populate('issuedBy', 'name username')
      .lean();

    res.json({ certificates });
  } catch (err) {
    console.error('getUserCertificates error:', err);
    res.status(500).json({ error: 'Failed to fetch certificates' });
  }
};

/**
 * GET /api/certificate/verify/:credentialId
 * Public endpoint to verify a certificate
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { credentialId } = req.params;
    const certificate = await Certificate.findOne({ credentialId })
      .populate('issuedTo', 'name')
      .populate('issuedBy', 'name')
      .lean();

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found or invalid' });
    }

    res.json({ certificate });
  } catch (err) {
    console.error('verifyCertificate error:', err);
    res.status(500).json({ error: 'Failed to verify certificate' });
  }
};


/**
 * POST /api/certificate/upload-generated
 * Bulk upload and send emails
 */
export const uploadGenerated = async (req, res) => {
  try {
    const { certificates, templateType, templateTitle, templateDescription } = req.body;
    
    if (!Array.isArray(certificates) || certificates.length === 0) {
      return res.status(400).json({ error: 'No certificates provided' });
    }

    const savedCerts = [];

    for (const certData of certificates) {
      const { credentialId, issuedToName, issuedToEmail, imageBase64 } = certData;

      // Extract base64 part
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Supabase Storage
      const bucketName = process.env.SUPABASE_BUCKET || 'certificates';
      const filename = `${credentialId}_${Date.now()}.png`;
      const filePath = `generated/${filename}`;

      const { data, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: true
        });

      if (uploadError) {
        console.error('Supabase upload error:', uploadError);
        throw new Error('Failed to upload image to Supabase');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);

      const imageUrl = publicUrl;

      const certificate = await Certificate.create({
        credentialId,
        issuedToName,
        issuedToEmail,
        issuedBy: req.userId,
        type: templateType,
        title: templateTitle,
        description: templateDescription,
        imageUrl,
      });
      savedCerts.push(certificate);

      // Send branded certificate email
      const certVerifyLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${credentialId}`;
      const linkedInShareUrl = `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=${encodeURIComponent(templateTitle)}&organizationName=SQAC&certId=${credentialId}&certUrl=${encodeURIComponent(certVerifyLink)}`;

      sendMail({
        to: issuedToEmail,
        subject: `SQAC Portal — Your Certificate: ${templateTitle}`,
        html: certificateIssuedEmail(issuedToName, templateTitle, imageUrl, certVerifyLink, linkedInShareUrl),
      }).catch((mailErr) => console.error('Failed to send certificate email to', issuedToEmail, mailErr));
    }

    res.status(201).json({ message: 'Certificates generated and sent', count: savedCerts.length });
  } catch (err) {
    console.error('uploadGenerated error:', err);
    res.status(500).json({ error: 'Failed to process certificates' });
  }
};
