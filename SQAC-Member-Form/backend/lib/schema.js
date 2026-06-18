import mongoose from "mongoose";

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove symbols
    .replace(/\s+/g, "-")       // spaces → -
    .replace(/-+/g, "-");       // remove double -
}

const MemberSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true,
    },
    slug: {
    type: String,
    unique: true,
    index: true,
  },
    srmmail:{
        type:String,
        required:true,
        unique:true
    },
    coredomain:{
        type:String,
        required:true,
    },
    subdomain:{
        type:String,
        
    },
    position:{type:String},

    insta:{
        type:String,
        required:true,
    },
    github:{
        type:String,
        required:true,
    },
    linkdln:{
        type:String,
        required:true,
    },
    pnumber:{
        type:String,
        required:true
    },
    pic:{
        type:String,
        required:true
    },
    portfolio:{
        type:String,
    }



})
MemberSchema.pre("save", function (next) {
  this.slug = slugify(this.name);

});

export default mongoose.model('members', MemberSchema);
