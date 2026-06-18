import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import connectDB from "./src/lib/db.js";
import { requireRole } from "./src/middleware/role.middleware.js";
import { requirePermission, getPermissionsForRole, ALL_ADMIN_ROLES } from "./src/middleware/permissions.middleware.js";

// Controllers
import {
  createUser,
  loginUser,
  logoutUser,
  authenticateToken,
  getrole,
  completeOnboarding,
} from "./src/controllers/User.controller.js";

import {
  getprofile,
  getotp,
  verifyotp,
  resetpassword,
  editprofile,
  noticeusers,
} from "./src/controllers/role.user.controller.js";

import {
  getmembers,
  getSubAdmins,
  deleteUser,
  deleteSubAdmin,
  changeposition,
  changerole,
  allowmember,
  showstatus,
  rejectmember,
  getpendingmembers,
  getnotices,
  createnotice,
  deletenotice,
  createMeet,
  editMeet,
  deleteMeet,
  getMeet,
  sendWarning,
  addAttendance,
  getAttendance,
  getALlAttendace,
  editAttendance,
  getAttendanceByDomain,
  getAttendanceByDomainSubdomain
} from "./src/controllers/admin.controller.js";

import certificateRoutes from "./src/routes/certificate.routes.js";
import projectRoutes from "./src/routes/project.routes.js";
import momRoutes from "./src/routes/mom.routes.js";
import cocRoutes from "./src/routes/coc.routes.js";

const app = express();

const allowedOrigins = (process.env.FRONTEND_URL || "")
  .split(",")
  .map((o) => o.trim().replace(/\/$/, ""))
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
};

// Middleware
app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

// --- Public Routes ---
app.post("/user/create", createUser);
app.post("/user/login", loginUser);
app.post("/logout", logoutUser);
app.post("/api/auth/complete-onboarding", completeOnboarding);

// OTP & Password Reset
app.post("/otp/get", getotp);
app.post("/otp/verify", verifyotp);
app.post("/password/reset", resetpassword);

// Certificates (Public and Protected inside)
app.use("/api/certificate", certificateRoutes);

// --- Protected Routes ---
app.use(authenticateToken); // Apply to all routes below

// User Profile
app.get("/user/profile", getprofile);
app.put("/user/update", editprofile);
app.get("/user/role", getrole);

// Permissions endpoint — returns role-based permission flags for the logged-in user
app.get("/api/permissions/me", (req, res) => {
  res.json(getPermissionsForRole(req.user.role));
});

// Admin Management
app.get("/admin/members", getmembers);
app.get("/admin/subadmins", getSubAdmins);
app.delete("/admin/user/:id", deleteUser);
app.delete("/admin/subadmin/:id", deleteSubAdmin);
app.put("/admin/position/:id", changeposition);
app.put("/admin/role/:id", changerole);
app.post("/admin/approve/:id", allowmember);
app.get("/admin/status/:id", showstatus);
app.post("/admin/reject/:id", rejectmember);
app.post("/admin/warn/:id", sendWarning);
app.get("/admin/pending", getpendingmembers);

//Meetings
app.post("/meet/create", createMeet);
app.put("/meet/edit/:id", editMeet);
app.delete("/meet/delete/:id", deleteMeet);
app.get("/meet/getmeet", getMeet);

// Notices
app.get("/notices", getnotices);
app.post("/notices/create", createnotice);
app.delete("/notices/:id", deletenotice);
app.get("/usernotice/:id", noticeusers);

// Projects & Recommendation Engine
app.use("/api/projects", projectRoutes);

// Minutes of Meeting (MOM)
app.use("/api/mom", momRoutes);

// Code of Conduct
app.use("/api/coc", cocRoutes);

//Attendance
app.post("/attendance/add", requirePermission("MANAGE_ATTENDANCE"), addAttendance);
app.get("/attendance/user/:userID", getAttendance);
app.get("/attendance/all", requirePermission("MANAGE_ATTENDANCE"), getALlAttendace);
app.put("/attendance/edit/:id", requirePermission("MANAGE_ATTENDANCE"), editAttendance);
app.get("/attendance/domain", requirePermission("MANAGE_ATTENDANCE"), getAttendanceByDomain);
app.get("/attendance/by-domain-subdomain", requirePermission("MANAGE_ATTENDANCE"), getAttendanceByDomainSubdomain);

// Ping endpoint for keep-alive
app.get("/api/ping", (req, res) => {
  res.status(200).json({ message: "pong" });
});

// Database Connection (no app.listen — the gateway owns the HTTP server)
connectDB()
  .then(() => console.log("Portal: Connected to MongoDB"))
  .catch((err) => {
    console.error("Portal MongoDB connection error:", err);
    process.exit(1);
  });

// Exported so gateway.js can mount this app under the single entry point
export default app;
