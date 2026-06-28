import MemberProfile from "../models/MemberProfile.js";
import Project from "../models/Project.js";
import sendMail from "../lib/mailer.js";
import { projectAssignedEmail } from "../lib/email-templates.js";
import { generateProjectFromPrompt } from "../lib/groq.js";

// ─── GET ALL MEMBERS WITH PROFILES ─────────────────────────────────────────
export const getAllProfiles = async (req, res) => {
  try {
    const profiles = await MemberProfile.find().sort({ overallScore: -1 });
    res.json(profiles);
  } catch (error) {
    console.error("GET PROFILES ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET MEMBERS BY STATUS ─────────────────────────────────────────────────
export const getMembersByStatus = async (req, res) => {
  try {
    const { status } = req.params; // available | assigned | on_break
    const profiles = await MemberProfile.find({ status }).sort({
      overallScore: -1,
    });
    res.json(profiles);
  } catch (error) {
    console.error("GET MEMBERS BY STATUS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── UPDATE MEMBER STATUS ──────────────────────────────────────────────────
export const updateMemberStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!["available", "assigned", "on_break"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const profile = await MemberProfile.findByIdAndUpdate(
      id,
      { status, ...(status === "available" ? { currentProjectId: null } : {}) },
      { new: true },
    );
    if (!profile)
      return res.status(404).json({ message: "Member not found" });
    res.json(profile);
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── PROJECTS CRUD ─────────────────────────────────────────────────────────
export const createProject = async (req, res) => {
  try {
    const project = new Project({
      ...req.body,
      createdBy: req.user?._id || null,
    });
    await project.save();
    res.status(201).json(project);
  } catch (error) {
    console.error("CREATE PROJECT ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── AI PROJECT GENERATION (reuses the Groq client) ────────────────────────
export const generateProjectWithAI = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ message: "Prompt too short. Describe the project in more detail." });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ message: "AI service not configured. Please add GROQ_API_KEY to .env" });
    }

    const structured = await generateProjectFromPrompt(prompt.trim());
    res.json({ success: true, data: structured });
  } catch (error) {
    console.error("AI GENERATE PROJECT ERROR:", error);
    res.status(500).json({ message: "AI generation failed.", error: error.message });
  }
};

export const getAllProjects = async (req, res) => {
  try {
    const projects = await Project.find()
      .populate("teamMembers.memberId", "fullName email domain webdevTier aimlTier webdevScore aimlScore status")
      .populate("projectLead", "fullName email domain")
      .sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error("GET PROJECTS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("teamMembers.memberId")
      .populate("projectLead");
    if (!project)
      return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    console.error("GET PROJECT ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const updateProject = async (req, res) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!project)
      return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (error) {
    console.error("UPDATE PROJECT ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    // Free up assigned members
    for (const tm of project.teamMembers) {
      await MemberProfile.findByIdAndUpdate(tm.memberId, {
        status: "available",
        currentProjectId: null,
      });
    }
    if (project.projectLead) {
      await MemberProfile.findByIdAndUpdate(project.projectLead, {
        status: "available",
        currentProjectId: null,
      });
    }

    await Project.findByIdAndDelete(req.params.id);
    res.json({ message: "Project deleted successfully" });
  } catch (error) {
    console.error("DELETE PROJECT ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── RECOMMENDATION ENGINE ─────────────────────────────────────────────────
// The core algorithm that forms a balanced team (senior + mid + rookie)
export const recommendTeam = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project)
      return res.status(404).json({ message: "Project not found" });
    if (project.status !== "unassigned") {
      return res
        .status(400)
        .json({ message: "Project already has a team assigned" });
    }

    const teamSize = project.teamSize || 3;
    const domain = project.domain;

    // Determine which score field and tier field to use
    let scoreField, tierField;
    const corpDomains = ["Events", "Media", "Public Relations", "Sponsorships", "Creatives", "Corporate"];
    
    if (domain === "AI/ML") {
      scoreField = "aimlScore";
      tierField = "aimlTier";
    } else if (corpDomains.includes(domain)) {
      scoreField = "corpScore";
      tierField = "corpTier";
    } else {
      // "Web Development" and "Cross-Domain" primarily use webdev
      scoreField = "webdevScore";
      tierField = "webdevTier";
    }

    // Fetch all available members
    const available = await MemberProfile.find({ status: "available" }).sort({
      [scoreField]: -1,
    });

    if (available.length === 0) {
      return res.status(400).json({
        message: "No available members to assign",
        available: 0,
      });
    }

    // Separate by tier
    const seniors = available.filter((m) => m[tierField] === "senior");
    const mids = available.filter((m) => m[tierField] === "mid");
    const rookies = available.filter((m) => m[tierField] === "rookie");

    const team = [];

    // Strategy: 1 senior (lead), 1-2 mid, rest rookies
    // If team size is 3: 1 senior + 1 mid + 1 rookie
    // If team size is 2: 1 senior + 1 mid/rookie
    // If team size > 3: 1 senior + floor((n-1)/2) mid + rest rookies

    const seniorCount = Math.min(1, seniors.length);
    const midCount = Math.min(
      Math.max(1, Math.floor((teamSize - 1) / 2)),
      mids.length,
    );
    const rookieCount = Math.min(
      teamSize - seniorCount - midCount,
      rookies.length,
    );

    // Pick top seniors
    for (let i = 0; i < seniorCount && team.length < teamSize; i++) {
      team.push({ member: seniors[i], tier: "senior", role: "lead" });
    }
    // Pick top mids
    for (let i = 0; i < midCount && team.length < teamSize; i++) {
      team.push({ member: mids[i], tier: "mid", role: "developer" });
    }
    // Pick top rookies
    for (let i = 0; i < rookieCount && team.length < teamSize; i++) {
      team.push({ member: rookies[i], tier: "rookie", role: "contributor" });
    }

    // If still under team size, fill from any available remaining
    if (team.length < teamSize) {
      const pickedIds = new Set(team.map((t) => t.member._id.toString()));
      const remaining = available.filter(
        (m) => !pickedIds.has(m._id.toString()),
      );
      for (
        let i = 0;
        i < remaining.length && team.length < teamSize;
        i++
      ) {
        team.push({
          member: remaining[i],
          tier: remaining[i][tierField],
          role: "developer",
        });
      }
    }

    // For Cross-Domain projects, try to include at least 1 AIML member
    if (domain === "Cross-Domain" && team.length > 0) {
      const hasAiml = team.some(
        (t) => t.member.domain?.includes("AI/ML"),
      );
      if (!hasAiml) {
        // Try to swap the last contributor with an available AIML member
        const aimlMember = available.find(
          (m) =>
            m.domain?.includes("AI/ML") &&
            !team.some((t) => t.member._id.toString() === m._id.toString()),
        );
        if (aimlMember && team.length > 1) {
          team[team.length - 1] = {
            member: aimlMember,
            tier: aimlMember.aimlTier,
            role: "developer",
          };
        }
      }
    }

    if (team.length === 0) {
      return res.status(400).json({
        message: "Could not form a team with available members",
      });
    }

    // Build team assignment
    const teamMembers = team.map((t) => ({
      memberId: t.member._id,
      role: t.role,
      tier: t.tier,
      assignedAt: new Date(),
    }));

    // The lead is the senior or first member
    const leadMember = team.find((t) => t.role === "lead") || team[0];

    // Update project
    project.teamMembers = teamMembers;
    project.projectLead = leadMember.member._id;
    project.status = "in_progress";
    await project.save();

    // Update each member's status
    for (const t of team) {
      await MemberProfile.findByIdAndUpdate(t.member._id, {
        status: "assigned",
        currentProjectId: project._id,
      });
    }

    // Populate and return the updated project
    const updatedProject = await Project.findById(projectId)
      .populate("teamMembers.memberId", "fullName email domain webdevTier aimlTier webdevScore aimlScore")
      .populate("projectLead", "fullName email domain");

    // Fire-and-forget: email each assigned member their project brief
    (async () => {
      try {
        const portalLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/user/projects`;
        await Promise.allSettled(
          team.map((t) =>
            sendMail({
              to: t.member.email,
              subject: `SQAC Portal — You've been assigned to "${project.title}"`,
              html: projectAssignedEmail(t.member.fullName, project, t.role, portalLink),
            })
          )
        );
      } catch (e) {
        console.error("Project assignment emails failed:", e);
      }
    })();

    res.json({
      message: "Team successfully assigned!",
      project: updatedProject,
      teamFormed: team.map((t) => ({
        name: t.member.fullName,
        tier: t.tier,
        role: t.role,
        domain: t.member.domain,
        score:
          domain === "AI/ML"
            ? t.member.aimlScore
            : t.member.webdevScore,
      })),
    });
  } catch (error) {
    console.error("RECOMMEND TEAM ERROR:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// ─── UNASSIGN TEAM ──────────────────────────────────────────────────────────
export const unassignTeam = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    // Free all team members
    for (const tm of project.teamMembers) {
      await MemberProfile.findByIdAndUpdate(tm.memberId, {
        status: "available",
        currentProjectId: null,
      });
    }
    if (project.projectLead) {
      await MemberProfile.findByIdAndUpdate(project.projectLead, {
        status: "available",
        currentProjectId: null,
      });
    }

    project.teamMembers = [];
    project.projectLead = null;
    project.status = "unassigned";
    await project.save();

    res.json({ message: "Team unassigned successfully" });
  } catch (error) {
    console.error("UNASSIGN TEAM ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── SUBMISSION TRACKING ────────────────────────────────────────────────────
export const addSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const { memberId, memberName, note, link } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    project.submissions.push({
      memberId,
      memberName,
      note,
      link,
      submittedAt: new Date(),
      status: "pending",
    });

    await project.save();
    res.json({ message: "Submission added", project });
  } catch (error) {
    console.error("ADD SUBMISSION ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const reviewSubmission = async (req, res) => {
  try {
    const { id, submissionId } = req.params;
    const { status, reviewedBy } = req.body;

    const project = await Project.findById(id);
    if (!project)
      return res.status(404).json({ message: "Project not found" });

    const submission = project.submissions.id(submissionId);
    if (!submission)
      return res.status(404).json({ message: "Submission not found" });

    submission.status = status;
    submission.reviewedBy = reviewedBy;
    await project.save();

    res.json({ message: "Submission reviewed", project });
  } catch (error) {
    console.error("REVIEW SUBMISSION ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── DASHBOARD STATS ────────────────────────────────────────────────────────
export const getDashboardStats = async (req, res) => {
  try {
    const [totalMembers, availableMembers, assignedMembers, onBreakMembers, totalProjects, unassignedProjects, inProgressProjects, completedProjects] =
      await Promise.all([
        MemberProfile.countDocuments(),
        MemberProfile.countDocuments({ status: "available" }),
        MemberProfile.countDocuments({ status: "assigned" }),
        MemberProfile.countDocuments({ status: "on_break" }),
        Project.countDocuments(),
        Project.countDocuments({ status: "unassigned" }),
        Project.countDocuments({ status: "in_progress" }),
        Project.countDocuments({ status: "completed" }),
      ]);

    res.json({
      members: {
        total: totalMembers,
        available: availableMembers,
        assigned: assignedMembers,
        onBreak: onBreakMembers,
      },
      projects: {
        total: totalProjects,
        unassigned: unassignedProjects,
        inProgress: inProgressProjects,
        completed: completedProjects,
      },
    });
  } catch (error) {
    console.error("DASHBOARD STATS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── UPDATE MEMBER SKILLS (real-time recalculation) ─────────────────────────
export const updateMemberSkills = async (req, res) => {
  try {
    const { id } = req.params;
    const { skills, corpSkills, coreDomain, techSubDomain, corpSubDomain, hoursPerWeek, preferredWork } = req.body;

    const profile = await MemberProfile.findById(id);
    if (!profile) return res.status(404).json({ message: "Member not found" });

    if (skills) profile.skills = { ...profile.skills.toObject(), ...skills };
    if (corpSkills) profile.corpSkills = { ...profile.corpSkills.toObject(), ...corpSkills };
    if (coreDomain) profile.coreDomain = coreDomain;
    if (techSubDomain !== undefined) profile.techSubDomain = techSubDomain;
    if (corpSubDomain !== undefined) profile.corpSubDomain = corpSubDomain;
    if (hoursPerWeek) profile.hoursPerWeek = hoursPerWeek;
    if (preferredWork) profile.preferredWork = preferredWork;

    await profile.save(); // triggers pre-save → recalculates scores + tiers
    res.json({ message: "Skills updated, scores recalculated", profile });
  } catch (error) {
    console.error("UPDATE SKILLS ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── GET PROFILE BY EMAIL ───────────────────────────────────────────────────
export const getProfileByEmail = async (req, res) => {
  try {
    const { email } = req.params;
    const profile = await MemberProfile.findOne({ email: email.toLowerCase() });
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  } catch (error) {
    console.error("GET PROFILE BY EMAIL ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// ─── CREATE/UPSERT PROFILE (for onboarding) ────────────────────────────────
export const upsertProfile = async (req, res) => {
  try {
    const { email, fullName, coreDomain, techSubDomain, corpSubDomain, skills, corpSkills, userId } = req.body;
    if (!email || !fullName) return res.status(400).json({ message: "Email and name required" });

    let profile = await MemberProfile.findOne({ email: email.toLowerCase() });
    if (profile) {
      if (fullName) profile.fullName = fullName;
      if (coreDomain) profile.coreDomain = coreDomain;
      if (techSubDomain !== undefined) profile.techSubDomain = techSubDomain;
      if (corpSubDomain !== undefined) profile.corpSubDomain = corpSubDomain;
      if (skills) profile.skills = { ...profile.skills.toObject(), ...skills };
      if (corpSkills) profile.corpSkills = { ...profile.corpSkills.toObject(), ...corpSkills };
      if (userId) profile.userId = userId;
      await profile.save();
    } else {
      profile = new MemberProfile({ email: email.toLowerCase(), fullName, coreDomain, techSubDomain, corpSubDomain, skills, corpSkills, userId });
      await profile.save();
    }
    res.json({ message: "Profile saved", profile });
  } catch (error) {
    console.error("UPSERT PROFILE ERROR:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

export const getMyProjects = async (req, res) => {
  try {
    const userId = req.user.id;
    const memberProfile = await MemberProfile.findOne({ userId });

    // No projects profile yet → the user simply has no assigned projects.
    // Return an empty list rather than a 404 (which the dashboard/MyProjects
    // treat as an error and which spammed the network log).
    if (!memberProfile) {
      return res.json([]);
    }

    const projects = await Project.find({ "teamMembers.memberId": memberProfile._id })
      .populate("teamMembers.memberId", "fullName email");
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const postThreadMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user.id;
    const role = req.user.role;
    const name = req.user.name;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.threads.push({
      senderId: userId,
      senderName: name,
      senderRole: role,
      message,
    });

    await project.save();
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

export const completeProject = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    // Mark project as completed
    project.status = "completed";
    await project.save();

    // Free up all assigned members
    if (project.teamMembers && project.teamMembers.length > 0) {
      for (const tm of project.teamMembers) {
        await MemberProfile.findByIdAndUpdate(tm.memberId, {
          status: "available",
          currentProjectId: null,
        });
      }
    }

    if (project.projectLead) {
      await MemberProfile.findByIdAndUpdate(project.projectLead, {
        status: "available",
        currentProjectId: null,
      });
    }

    res.json({ message: "Project marked as completed", project });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
