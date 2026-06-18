import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    domain: {
      type: String,
      enum: [
        "Web Development", "AI/ML", "Cross-Domain",
        "Events", "Media", "Public Relations", "Sponsorships", "Creatives", "Corporate"
      ],
      required: true,
    },

    // PRD fields
    objectives: [String],
    techStack: [String],
    features: [
      {
        name: String,
        description: String,
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "medium",
        },
      },
    ],
    deliverables: [String],
    timeline: { type: String }, // e.g. "2 weeks", "1 month"
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "intermediate",
    },

    // Team assignment
    teamSize: { type: Number, default: 3 },
    projectLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MemberProfile",
      default: null,
    },
    teamMembers: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MemberProfile",
        },
        role: {
          type: String,
          enum: ["lead", "developer", "contributor"],
          default: "developer",
        },
        tier: { type: String, enum: ["senior", "mid", "rookie"] },
        assignedAt: { type: Date, default: Date.now },
      },
    ],

    // Status
    status: {
      type: String,
      enum: ["unassigned", "in_progress", "completed", "on_hold"],
      default: "unassigned",
    },

    // Submission tracking
    submissions: [
      {
        memberId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MemberProfile",
        },
        memberName: String,
        note: String,
        link: String,
        submittedAt: { type: Date, default: Date.now },
        status: {
          type: String,
          enum: ["pending", "approved", "revision_needed"],
          default: "pending",
        },
        reviewedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "MemberProfile",
          default: null,
        },
      },
    ],

    // Live review thread
    threads: [
      {
        senderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        senderName: String,
        senderRole: String, // "admin", "lead", "member"
        message: String,
        timestamp: { type: Date, default: Date.now },
      }
    ],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Project", projectSchema);
