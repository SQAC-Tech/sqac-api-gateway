import { Router } from "express";
import {
  getCOCStatus,
  generatePreview,
  confirmCOC,
  completeProfile,
  getCOCRecords,
  getCOCPdf,
} from "../controllers/coc.controller.js";

const router = Router();

// All routes here are already protected by authenticateToken in server.js
router.get("/status", getCOCStatus);
router.post("/preview", generatePreview);
router.post("/confirm", confirmCOC);
router.post("/profile", completeProfile);
router.get("/records", getCOCRecords);
router.get("/records/:userId/pdf", getCOCPdf);

export default router;
