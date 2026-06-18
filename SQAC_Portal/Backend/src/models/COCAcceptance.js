import mongoose from "mongoose";

const cocAcceptanceSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    memberId:    { type: String, required: true, index: true },
    fullName:    { type: String, required: true },
    acceptedAt:  { type: Date, required: true, index: true },
    cocVersion:  { type: String, required: true },
    pdfData:     { type: Buffer, default: null },
    ipAddress:   { type: String, default: "" },
    userAgent:   { type: String, default: "" },
  },
  { timestamps: true }
);

// One acceptance record per user per version
cocAcceptanceSchema.index({ userId: 1, cocVersion: 1 }, { unique: true });

export default mongoose.model("COCAcceptance", cocAcceptanceSchema);
