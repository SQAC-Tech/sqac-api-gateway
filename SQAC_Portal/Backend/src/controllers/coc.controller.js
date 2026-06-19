import path from "path";
import { fileURLToPath } from "url";
import User from "../models/User.js";
import COCAcceptance from "../models/COCAcceptance.js";
import { generateSignedCOC } from "../lib/pdfService.js";
import { CURRENT_COC_VERSION } from "../config/cocPdfConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COC_PDF_PATH = path.join(__dirname, "../../public/coc.pdf");

const ROLE_LABELS = {
  secretary: "Secretary",
  joint_secretary: "Joint Secretary",
  technical_lead: "Technical Lead",
  project_lead: "Project Lead",
  corp_lead: "Corporate Lead",
  domain_lead: "Domain Lead",
  associate_lead: "Associate Lead",
  member: "Member",
};

// ── GET /api/coc/status ───────────────────────────────────────────────────────
export const getCOCStatus = async (req, res) => {
  try {
    const user = req.user;
    res.json({
      accepted: user.cocAccepted === true,
      version: user.cocVersionAccepted || null,
      currentVersion: CURRENT_COC_VERSION,
      profileCompleted: user.profileCompleted === true,
    });
  } catch (err) {
    console.error("COC status error:", err);
    res.status(500).json({ error: "Server error" });
  }
};

// ── POST /api/coc/preview ─────────────────────────────────────────────────────
// Generates a signed PDF preview without persisting anything.
export const generatePreview = async (req, res) => {
  try {
    const { signatureBase64, mimeType } = req.body;

    if (!signatureBase64) {
      return res.status(400).json({ error: "Signature image is required." });
    }

    const allowedMime = ["image/png", "image/jpeg", "image/jpg"];
    const resolvedMime = mimeType || "image/png";
    if (!allowedMime.includes(resolvedMime)) {
      return res.status(400).json({ error: "Signature must be PNG or JPG." });
    }

    const user = req.user;
    const positionLabel = ROLE_LABELS[user.role] || user.role;
    const domain = user.subDomain || user.coreDomain || "—";

    const signedPdfBytes = await generateSignedCOC({
      signatureBase64,
      memberName: user.name,
      position: positionLabel,
      domain,
      mimeType: resolvedMime,
    });

    const base64Pdf = Buffer.from(signedPdfBytes).toString("base64");
    res.json({ previewBase64: base64Pdf });
  } catch (err) {
    console.error("COC preview error:", err);
    res.status(500).json({ error: "Failed to generate PDF preview." });
  }
};

// ── POST /api/coc/confirm ─────────────────────────────────────────────────────
// Persists the signed PDF, creates the acceptance record, marks user as accepted.
export const confirmCOC = async (req, res) => {
  try {
    const { signatureBase64, mimeType } = req.body;

    if (!signatureBase64) {
      return res.status(400).json({ error: "Signature image is required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (user.cocAccepted && user.cocVersionAccepted === CURRENT_COC_VERSION) {
      return res.status(409).json({ error: "COC already accepted for this version." });
    }

    const resolvedMime = mimeType || "image/png";
    const positionLabel = ROLE_LABELS[user.role] || user.role;
    const domain = user.subDomain || user.coreDomain || "—";

    const signedPdfBytes = await generateSignedCOC({
      signatureBase64,
      memberName: user.name,
      position: positionLabel,
      domain,
      mimeType: resolvedMime,
    });

    // ── Acceptance record (PDF stored in MongoDB) ──────────────────────────────
    const now = new Date();
    await COCAcceptance.findOneAndUpdate(
      { userId: user._id, cocVersion: CURRENT_COC_VERSION },
      {
        userId: user._id,
        memberId: user.regNum || String(user._id),
        fullName: user.name,
        acceptedAt: now,
        cocVersion: CURRENT_COC_VERSION,
        pdfData: Buffer.from(signedPdfBytes),
        ipAddress: req.ip || "",
        userAgent: req.headers["user-agent"] || "",
      },
      { upsert: true, new: true }
    );

    // ── Update user ────────────────────────────────────────────────────────────
    user.cocAccepted = true;
    user.cocAcceptedAt = now;
    user.cocVersionAccepted = CURRENT_COC_VERSION;
    await user.save();

    res.json({ success: true });
  } catch (err) {
    console.error("COC confirm error:", err);
    res.status(500).json({ error: "Failed to confirm COC acceptance." });
  }
};

// ── POST /api/coc/profile ─────────────────────────────────────────────────────
// Saves extended profile fields and marks profileCompleted = true.
export const completeProfile = async (req, res) => {
  try {
    const {
      department,
      section,
      facultyAdvisorName,
      facultyAdvisorNo,
      domain,
      position,
      residenceType,
      name,
    } = req.body;

    const required = ["department", "section", "facultyAdvisorName", "facultyAdvisorNo", "residenceType"];
    for (const field of required) {
      if (!req.body[field]?.toString().trim()) {
        return res.status(400).json({ error: `${field} is required.` });
      }
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ error: "User not found." });

    if (name?.trim()) user.name = name.trim();
    user.department = department.trim();
    user.section = section.trim();
    user.facultyAdvisorName = facultyAdvisorName.trim();
    user.facultyAdvisorNo = facultyAdvisorNo.trim();
    if (domain?.trim()) user.subDomain = domain.trim();
    if (position?.trim()) user.position = position.trim();
    user.residenceType = residenceType;
    user.profileCompleted = true;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        regNum: user.regNum,
        coreDomain: user.coreDomain,
        subDomain: user.subDomain,
        role: user.role,
        cocAccepted: user.cocAccepted,
        profileCompleted: user.profileCompleted,
      },
    });
  } catch (err) {
    console.error("Complete profile error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// ── GET /api/coc/records ──────────────────────────────────────────────────────
// Secretary only — list all acceptance records.
export const getCOCRecords = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "secretary" && role !== "joint_secretary") {
      return res.status(403).json({ error: "Not authorised." });
    }
    const records = await COCAcceptance.find()
      .sort({ acceptedAt: -1 })
      .lean();
    res.json(records);
  } catch (err) {
    console.error("COC records error:", err);
    res.status(500).json({ error: "Server error." });
  }
};

// ── GET /api/coc/records/:userId/pdf ─────────────────────────────────────────
// Public — serves the blank COC PDF for members to read (no auth, used in iframe).
export const getCOCDocument = (req, res) => {
  res.sendFile(COC_PDF_PATH, (err) => {
    if (err) {
      console.error("COC document serve error:", err);
      res.status(500).json({ error: "Could not load COC document." });
    }
  });
};

// Secretary only — stream the stored signed PDF from MongoDB.
export const getCOCPdf = async (req, res) => {
  try {
    const { role } = req.user;
    if (role !== "secretary" && role !== "joint_secretary") {
      return res.status(403).json({ error: "Not authorised." });
    }
    const record = await COCAcceptance.findOne({ userId: req.params.userId });
    if (!record) return res.status(404).json({ error: "No record found." });
    if (!record.pdfData) return res.status(404).json({ error: "PDF not stored for this record." });

    const fileName = `${record.memberId}-signed-coc.pdf`;
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `inline; filename="${fileName}"`);
    res.send(record.pdfData);
  } catch (err) {
    console.error("COC PDF download error:", err);
    res.status(500).json({ error: "Server error." });
  }
};
