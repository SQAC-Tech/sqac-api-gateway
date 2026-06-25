import { Router } from "express";
import {
  getAllProfiles,
  getMembersByStatus,
  updateMemberStatus,
  updateMemberSkills,
  getProfileByEmail,
  upsertProfile,
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  recommendTeam,
  unassignTeam,
  addSubmission,
  reviewSubmission,
  getDashboardStats,
  getMyProjects,
  postThreadMessage,
  completeProject,
  generateProjectWithAI,
} from "../controllers/project.controller.js";
import { requireRole } from "../middleware/role.middleware.js";
import { requirePermission } from "../middleware/permissions.middleware.js";

const router = Router();

// Dashboard Stats
router.get("/stats", getDashboardStats);

// Member Profiles
router.get("/members", getAllProfiles);
router.get("/members/status/:status", getMembersByStatus);
router.put("/members/:id/status", requireRole("admin", "subadmin"), updateMemberStatus);
router.put("/members/:id/skills", requireRole("admin", "subadmin"), updateMemberSkills);
router.get("/members/email/:email", getProfileByEmail);
router.post("/members/upsert", requireRole("admin", "subadmin"), upsertProfile);

// AI project generation (reuses the Groq client) — gate same as creation
router.post("/ai-generate", requirePermission("CREATE_PROJECT"), generateProjectWithAI);

// Projects CRUD
router.post("/", requirePermission("CREATE_PROJECT"), createProject);
router.get("/", getAllProjects);
router.get("/my-projects", getMyProjects);
router.get("/:id", getProjectById);
router.put("/:id", requirePermission("CREATE_PROJECT"), updateProject);
router.put("/:id/complete", requirePermission("ASSIGN_PROJECT"), completeProject);
router.delete("/:id", requirePermission("CREATE_PROJECT"), deleteProject);

// Recommendation Engine
router.post("/:projectId/recommend", requirePermission("ASSIGN_PROJECT"), recommendTeam);
router.post("/:id/unassign", requirePermission("ASSIGN_PROJECT"), unassignTeam);

// Submissions & Threads
router.post("/:id/submissions", addSubmission);
router.put("/:id/submissions/:submissionId/review", reviewSubmission);
router.post("/:id/threads", postThreadMessage);

export default router;
