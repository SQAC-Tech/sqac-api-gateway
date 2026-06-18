import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();
const connectDB = async()=>{
    await mongoose.connect(process.env.PORTAL_MONGO_URI || process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
}
export default connectDB;

