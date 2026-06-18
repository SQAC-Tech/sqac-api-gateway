import mongoose from "mongoose";
import dotenv from 'dotenv';
dotenv.config();

function connectDB(){
    mongoose.connect(process.env.MEMBERFORM_MONGO_URI || process.env.MONGO_URI)
    .then(()=>{
        console.log('MongoDB Connected');
    })

};

export default connectDB;