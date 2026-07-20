import express from 'express'
import dotenv from 'dotenv'
import connectDB from './lib/db.js';
import cors from 'cors'
import multer from 'multer'
import cloudinary from './lib/cloudinary.js';
import Member from './lib/schema.js';
dotenv.config()

const Port = process.env.PORT || 3000
const app = express();

app.use(express.json())

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://sqac-member-form.vercel.app",
    "https://sqac-website.vercel.app",
    "https://www.sqac.space",
    "https://sqac-members-details.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));


function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")   // remove symbols
    .replace(/\s+/g, "-")       // spaces → -
    .replace(/-+/g, "-");       // remove double -
}

const upload = multer({storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }})

connectDB();

app.post("/api/form", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" });
    }

    const {
      name,
      srmmail,
      github,
      insta,
      linkdln,
      coredomain,
      subdomain,
      position,
      pnumber
    } = req.body;
    if (!name || !srmmail || !github || !pnumber) {
  return res.status(400).json({
    success: false,
    message: "Required fields missing",
  });
}


    const file = req.file;
    const base64Image = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(base64Image, {
      folder: "sqac-members",
    });

  const slug = slugify(name)
    const newMember = new Member({
      name,
      srmmail,
      github,
      insta,
      linkdln,
      coredomain,
      subdomain: subdomain || undefined, 
      position: position || undefined, 
      pnumber,
      pic: result.secure_url,
      slug
    });

    await newMember.save();

    res.status(200).json({
      success: true,
      message: "Member registered successfully",
      member: {
        name: newMember.name,
        srmmail: newMember.srmmail,
        pic: newMember.pic
      }
    });
  } catch (error) {
    console.error("FORM SUBMISSION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Form submission failed",
    });
  }
});
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});



// Public directory — never expose PII (srmmail, phone). Anyone can hit this.
const PUBLIC_MEMBER_PROJECTION = "-srmmail -pnumber";

app.get('/api/getdata', async(req,res)=>{
  const data = await Member.find().select(PUBLIC_MEMBER_PROJECTION)
  res.json({
    data:data
  })
})

app.get('/api/getdata/:slug', async(req,res)=>{
  const {slug} = req.params


  const member = await Member.findOne({ slug }).select(PUBLIC_MEMBER_PROJECTION);

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member not found",
    });
  }

  res.json({
    success: true,
    member,
  });
});

// No app.listen — the gateway owns the HTTP server.
// Exported so gateway.js can mount this app under the single entry point.
export default app;
