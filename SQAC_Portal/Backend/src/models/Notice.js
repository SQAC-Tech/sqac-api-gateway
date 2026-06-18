import mongoose from "mongoose";

const noticeSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        desc: { type: String, required: true },

        author: String,
        image: String,
        link: String,
        domain: String,
        subDomain: String
    },
    {
        timestamps: true // ✅ THIS FIXES TIME
    }
);

export default mongoose.model("Notice", noticeSchema);