import express from "express";
import {
  createMOM,
  getAllMOMs,
  getMOMById,
  updateMOM,
  deleteMOM,
  generateMOMWithAI,
  getApprovedMembers,
} from "../controllers/mom.controller.js";
import { requirePermission } from "../middleware/permissions.middleware.js";

const router = express.Router();

// Member picker — must be before /:id so it isn't swallowed as a param
router.get("/members/approved", getApprovedMembers);

// AI generation
router.post("/ai-generate", requirePermission("GENERATE_MOM"), generateMOMWithAI);

// MOM CRUD
router.get("/all", getAllMOMs);
router.post("/create", requirePermission("GENERATE_MOM"), createMOM);
router.get("/:id", getMOMById);
router.put("/:id", requirePermission("GENERATE_MOM"), updateMOM);
router.delete("/:id", requirePermission("DELETE_MOM"), deleteMOM);

export default router;
