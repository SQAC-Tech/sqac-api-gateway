import mongoose from "mongoose";

const actionItemSchema = new mongoose.Schema(
  {
    task: { type: String, required: true },
    assignee: { type: String, default: "" }, // name string snapshot
    assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: ["pending", "in_progress", "done"], default: "pending" },
  },
  { _id: false }
);

const attendeeSnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: String,
    role: String,
    coreDomain: String,
    subDomain: String,
    email: String,
    external: { type: Boolean, default: false }, // guest not registered on the portal
  },
  { _id: false }
);

const MOMSchema = new mongoose.Schema(
  {
    // Core required fields
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },

    // Link to a scheduled Meeting document (optional)
    meetingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meeting",
      default: null,
    },

    // Date & time details
    date: { type: Date, required: true },
    startTime: { type: String, default: "" }, // e.g. "10:30 AM"
    duration: { type: String, default: "" },  // e.g. "1h 30m"

    // Who was in the meeting (snapshot at time of MOM creation)
    attendees: { type: [attendeeSnapshotSchema], default: [] },

    // Team scope (mirrors Meeting.teamScope)
    teamScope: {
      type: String,
      enum: [
        "all",
        "technical",
        "corporate",
        "Web Development",
        "AI/ML",
        "Events",
        "Media",
        "Public Relations",
        "Sponsorships",
        "Creatives",
      ],
      default: "all",
    },

    // Content fields
    discussedPoints: { type: [String], default: [] },
    decisions: { type: [String], default: [] },
    actionItems: { type: [actionItemSchema], default: [] },

    // Next meeting
    nextMeetDate: { type: Date, default: null },
    nextMeetAgenda: { type: String, default: "" },

    // AI metadata
    aiGenerated: { type: Boolean, default: false },
    rawPrompt: { type: String, default: "" },

    // Ownership
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.model("MOM", MOMSchema);
