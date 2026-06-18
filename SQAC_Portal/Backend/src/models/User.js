import mongoose from "mongoose";


const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
          },

    regNum: {
      type: String,
      required: true,
      unique: true,
          },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },

    phoneNumber: {
      type: String,
      required: true
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false
    },

    coreDomain: {
      type: String,
      required: true
    },

    subDomain: String,
    position: String,

    socials: {
      linkedin: String,
      github: String,
      instagram: String
    },

    bio: {
      type: String,
      maxlength: 150
    },
    image:{
        type:String,
        default:"https://images.unsplash.com/photo-1680355466468-bd0a68b11fa0?q=80&w=715&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    },
    role:{
        type:String,
        enum:['secretary','joint_secretary','technical_lead','project_lead','corp_lead','domain_lead','associate_lead','member'],
        default:'member'
    },

    approved:{
        type:Boolean,
        default:false
    },

    isOnboarded:{
        type:Boolean,
        default:false
    },

    undertakingSigned:{
        type:Boolean,
        default:false
    },

    cocSigned:{
        type:Boolean,
        default:false
    },

    rejectionReason:{
        type:String,
        default:''
    },

    // COC acceptance tracking
    cocAccepted:        { type: Boolean, default: false },
    cocAcceptedAt:      { type: Date, default: null },
    cocVersionAccepted: { type: String, default: null },

    // Profile completion (mandatory fields after COC)
    profileCompleted:   { type: Boolean, default: false },
    department:         { type: String, default: "" },
    section:            { type: String, default: "" },
    facultyAdvisorName: { type: String, default: "" },
    facultyAdvisorNo:   { type: String, default: "" },
    residenceType:      { type: String, enum: ["Hosteller", "Dayscholar", ""], default: "" },
  },
  { timestamps: true }
);
export default mongoose.model("User", userSchema);
