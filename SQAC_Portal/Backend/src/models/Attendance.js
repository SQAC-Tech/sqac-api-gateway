import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: Date, required: true },
    clockIn: { type: Date, required: true },
    clockOut: { type: Date, default: null },
    status: { type: String, enum: ["present", "absent", "late", "excused"], default: "absent" },
    meetType: { type: String, enum: ["gmeet", "in_person", "custom"], default: "gmeet" },
});

export default mongoose.model("Attendance", attendanceSchema);
