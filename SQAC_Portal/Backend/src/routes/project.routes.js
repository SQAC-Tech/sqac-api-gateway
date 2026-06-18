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
} from "../controllers/project.controller.js";
import { requireRole } from "../middleware/role.middleware.js";

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

// Projects CRUD
router.post("/", requireRole("admin", "subadmin"), createProject);
router.get("/", getAllProjects);
router.get("/my-projects", getMyProjects);
router.get("/:id", getProjectById);
router.put("/:id", requireRole("admin", "subadmin"), updateProject);
router.put("/:id/complete", requireRole("admin", "subadmin"), completeProject);
router.delete("/:id", requireRole("admin", "subadmin"), deleteProject);

// Recommendation Engine
router.post("/:projectId/recommend", requireRole("admin", "subadmin"), recommendTeam);
router.post("/:id/unassign", requireRole("admin", "subadmin"), unassignTeam);

// Submissions & Threads
router.post("/:id/submissions", addSubmission);
router.put("/:id/submissions/:submissionId/review", reviewSubmission);
router.post("/:id/threads", postThreadMessage);

export default router;
