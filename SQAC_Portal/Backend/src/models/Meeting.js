import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    startDate: Date,
    startTime: {
      type: Date,
      default: new Date("1970-01-01T10:30:00Z"),
    },
    meetlink: String,
    description: String,

    // Who created this meeting
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },

    // Scope: "all" | "technical" | "corporate" | sub-domain string
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

    // Array of user IDs invited / expected to attend
    attendees: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Meeting lifecycle status
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },

    // Reference to MOM if one has been filed
    momRef: { type: mongoose.Schema.Types.ObjectId, ref: "MOM", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Meeting", MeetingSchema);
