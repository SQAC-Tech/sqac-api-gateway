import MOM from "../models/MOM.js";
import Meeting from "../models/Meeting.js";
import User from "../models/User.js";
import { generateMOMFromPrompt } from "../lib/groq.js";
import sendMail from "../lib/mailer.js";
import { momCreatedEmail } from "../lib/email-templates.js";

// ─── Helper: roles that can see all MOMs ─────────────────────────────────────
const isPrivileged = (role) => ["admin", "subadmin", "lead"].includes(role);

// ─── Create MOM ──────────────────────────────────────────────────────────────
export const createMOM = async (req, res) => {
  try {
    const {
      title,
      description,
      meetingRef,
      date,
      startTime,
      duration,
      attendees,
      teamScope,
      discussedPoints,
      decisions,
      actionItems,
      nextMeetDate,
      nextMeetAgenda,
      aiGenerated,
      rawPrompt,
    } = req.body;

    if (!title || !date) {
      return res.status(400).json({ message: "Title and date are required." });
    }

    const toValidDate = (val) => {
      if (!val) return null;
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const mom = new MOM({
      title,
      description: description || "",
      meetingRef: meetingRef || null,
      date,
      startTime: startTime || "",
      duration: duration || "",
      attendees: attendees || [],
      teamScope: teamScope || "all",
      discussedPoints: discussedPoints || [],
      decisions: decisions || [],
      actionItems: (actionItems || []).map((a) => ({ ...a, dueDate: toValidDate(a.dueDate) })),
      nextMeetDate: toValidDate(nextMeetDate),
      nextMeetAgenda: nextMeetAgenda || "",
      aiGenerated: aiGenerated || false,
      rawPrompt: rawPrompt || "",
      createdBy: req.user._id,
    });

    await mom.save();

    // If a meeting was referenced, update its momRef back-link
    if (meetingRef) {
      await Meeting.findByIdAndUpdate(meetingRef, { momRef: mom._id, status: "completed" });
    }

    // Fire-and-forget: email creator + all attendees the published MOM
    (async () => {
      try {
        const portalLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/mom/list`;

        // Collect unique user IDs: attendees + the creator
        const attendeeUserIds = (attendees || []).map((a) => a.userId).filter(Boolean);
        const allUserIds = [...new Set([...attendeeUserIds, req.user._id.toString()])];

        const users = await User.find({ _id: { $in: allUserIds } }, "email name").lean();
        await Promise.allSettled(
          users.map((u) =>
            sendMail({
              to: u.email,
              subject: `SQAC Portal — MOM Published: ${title}`,
              html: momCreatedEmail(mom, u.name, portalLink),
            })
          )
        );
      } catch (e) {
        console.error("MOM notification emails failed:", e);
      }
    })();

    res.status(201).json({ message: "MOM created successfully.", mom });
  } catch (error) {
    console.error("CREATE MOM ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── Get All MOMs ─────────────────────────────────────────────────────────────
export const getAllMOMs = async (req, res) => {
  try {
    // All activated members can see the full MOM history
    const moms = await MOM.find()
      .sort({ date: -1 })
      .populate("createdBy", "name email role")
      .populate("meetingRef", "title startDate");

    res.json(moms);
  } catch (error) {
    console.error("GET MOMS ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── Get Single MOM ───────────────────────────────────────────────────────────
export const getMOMById = async (req, res) => {
  try {
    const mom = await MOM.findById(req.params.id)
      .populate("createdBy", "name email role")
      .populate("meetingRef", "title startDate startTime meetlink");

    if (!mom) return res.status(404).json({ message: "MOM not found." });

    // Access check: privileged users or creator or attendee
    const isCreator = mom.createdBy._id.toString() === req.user._id.toString();
    const isAttendee = mom.attendees.some(
      (a) => a.userId?.toString() === req.user._id.toString()
    );

    if (!isPrivileged(req.user.role) && !isCreator && !isAttendee) {
      return res.status(403).json({ message: "Not authorized to view this MOM." });
    }

    res.json(mom);
  } catch (error) {
    console.error("GET MOM ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── Update MOM ───────────────────────────────────────────────────────────────
export const updateMOM = async (req, res) => {
  try {
    const mom = await MOM.findById(req.params.id);
    if (!mom) return res.status(404).json({ message: "MOM not found." });

    const isCreator = mom.createdBy.toString() === req.user._id.toString();
    if (!isPrivileged(req.user.role) && !isCreator) {
      return res.status(403).json({ message: "Not authorized to edit this MOM." });
    }

    const allowed = [
      "title", "description", "date", "startTime", "duration",
      "attendees", "teamScope", "discussedPoints", "decisions",
      "actionItems", "nextMeetDate", "nextMeetAgenda",
    ];

    allowed.forEach((field) => {
      if (req.body[field] !== undefined) mom[field] = req.body[field];
    });

    await mom.save();
    res.json({ message: "MOM updated successfully.", mom });
  } catch (error) {
    console.error("UPDATE MOM ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── Delete MOM (admin only) ──────────────────────────────────────────────────
export const deleteMOM = async (req, res) => {
  try {
    const mom = await MOM.findByIdAndDelete(req.params.id);
    if (!mom) return res.status(404).json({ message: "MOM not found." });

    // Clear back-link on meeting
    if (mom.meetingRef) {
      await Meeting.findByIdAndUpdate(mom.meetingRef, { momRef: null });
    }

    res.json({ message: "MOM deleted successfully." });
  } catch (error) {
    console.error("DELETE MOM ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};

// ─── AI Generate MOM from Prompt ─────────────────────────────────────────────
export const generateMOMWithAI = async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || prompt.trim().length < 10) {
      return res.status(400).json({ message: "Prompt too short. Describe your meeting in more detail." });
    }

    if (!process.env.GROQ_API_KEY) {
      return res.status(503).json({ message: "AI service not configured. Please add GROQ_API_KEY to .env" });
    }

    const structured = await generateMOMFromPrompt(prompt.trim());
    res.json({ success: true, data: structured });
  } catch (error) {
    console.error("AI GENERATE MOM ERROR:", error);
    res.status(500).json({ message: "AI generation failed.", error: error.message });
  }
};

// ─── Get Approved Members (for attendee picker) ───────────────────────────────
export const getApprovedMembers = async (req, res) => {
  try {
    const { scope } = req.query; // optional: "technical" | "corporate" | sub-domain

    let filter = { approved: true };

    if (scope && scope !== "all") {
      const techSubDomains = ["Web Development", "AI/ML"];
      const corpSubDomains = ["Events", "Media", "Public Relations", "Sponsorships", "Creatives"];

      if (scope === "technical") {
        filter.coreDomain = "Technical";
      } else if (scope === "corporate") {
        filter.coreDomain = "Corporate";
      } else if (techSubDomains.includes(scope)) {
        filter.coreDomain = "Technical";
        filter.subDomain = scope;
      } else if (corpSubDomains.includes(scope)) {
        filter.coreDomain = "Corporate";
        filter.subDomain = scope;
      }
    }

    const members = await User.find(filter)
      .select("name email role coreDomain subDomain position image")
      .sort({ name: 1 });

    res.json(members);
  } catch (error) {
    console.error("GET APPROVED MEMBERS ERROR:", error);
    res.status(500).json({ message: "Server error.", error: error.message });
  }
};
