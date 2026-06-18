import User from "../models/User.js";
import redis from "../lib/redis.js";
import crypto from "crypto";
import sendMail from "../lib/mailer.js";
import bcrypt from "bcryptjs";

const OTP_EXP = 120;
const MAX_ATTEMPTS = 4;

const generateOTP = () => crypto.randomInt(100000, 999999).toString();

const sendOTP = async (email) => {
  const otp = generateOTP();
  await redis.hset(`otp:${email}`, { code: otp, attempts: 0 });
  await redis.expire(`otp:${email}`, OTP_EXP);
  await sendMail({
    to: email,
    subject: "Your OTP code",
    html: `
            <h2>Your verification code</h2>
            <p style="font-size:32px;font-weight:bold;letter-spacing:8px;">${otp}</p>
            <p>This code expires in 2 minutes. Do not share it with anyone.</p>
        `,
  });
};

const verifyOTP = async (email, inputCode) => {
  const data = await redis.hgetall(`otp:${email}`);

  if (!data || !data.code)
    return {
      success: false,
      message: "OTP expired or not found. Request a new one.",
    };

  const attempts = parseInt(data.attempts);

  if (attempts >= MAX_ATTEMPTS) {
    await redis.del(`otp:${email}`);
    return { success: false, message: "Too many attempts. Request a new OTP." };
  }

  if (data.code !== inputCode) {
    await redis.hincrby(`otp:${email}`, "attempts", 1);
    return {
      success: false,
      message: `Wrong OTP. ${MAX_ATTEMPTS - attempts - 1} attempts left.`,
    };
  }

  await redis.del(`otp:${email}`);
  return { success: true, message: "OTP verified!" };
};

const uploadProfileImageToCloudinary = async (imageFile, userId) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "sqac-portal/profile-images";
  const publicId = `user-${userId}-${timestamp}`;
  const signatureBase = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}${process.env.CLOUDINARY_SECRET}`;
  const signature = crypto
    .createHash("sha1")
    .update(signatureBase)
    .digest("hex");

  const formData = new FormData();
  formData.append("file", imageFile);
  formData.append("api_key", process.env.CLOUDINARY_API);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("public_id", publicId);
  formData.append("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.secure_url) {
    throw new Error(data?.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url;
};

export const getprofile = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Profile fetched successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

export const getotp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();

    if (!email) return res.status(400).json({ message: "Enter email" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ message: "Not a valid registered mail" });

    await sendOTP(email);
    res.json({ message: "OTP sent to your email" });
  } catch (error) {
    console.error("GET OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyotp = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();

    if (!email || !otp)
      return res.status(400).json({ message: "Email and OTP are required" });

    const result = await verifyOTP(email, otp);

    if (!result.success)
      return res.status(400).json({ message: result.message });

    await redis.set(`verified:${email}`, "true", "EX", 300);

    res.json({ message: "OTP verified. You can now reset your password." });
  } catch (error) {
    console.error("VERIFY OTP ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const resetpassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;

    if (!email || !password)
      return res
        .status(400)
        .json({ message: "Email and new password are required" });

    if (password.length < 8)
      return res
        .status(400)
        .json({ message: "Password must be at least 8 characters" });

    const isVerified = await redis.get(`verified:${email}`);
    if (!isVerified)
      return res
        .status(403)
        .json({ message: "OTP not verified. Please verify OTP first." });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    user.password = await bcrypt.hash(password, 15);
    await user.save();

    await redis.del(`verified:${email}`);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const editprofile = async (req, res) => {
  try {
    const { image, imageFile, socials, bio } = req.body;

    const forbiddenFields = [
      "role",
      "position",
      "password",
      "email",
      "name",
      "attendance",
    ];
    const invalidUpdates = Object.keys(req.body).filter((key) =>
      forbiddenFields.includes(key),
    );

    if (invalidUpdates.length > 0) {
      return res.status(400).json({
        message: `Cannot update ${invalidUpdates.join(", ")} through this route`,
      });
    }

    if (
      image === undefined &&
      imageFile === undefined &&
      socials === undefined &&
      bio === undefined
    ) {
      return res.status(400).json({
        message: "Provide image, bio, or socials to update",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (imageFile !== undefined) {
      user.image = await uploadProfileImageToCloudinary(imageFile, req.userId);
    } else if (image !== undefined) {
      user.image = image;
    }
    if (socials !== undefined) user.socials = socials;
    if (bio !== undefined) user.bio = bio;

    await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        ...user.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

export const noticeusers = async (req, res) => {
  const userId = req.params.userId;
  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const notices = await Notice.findAll({
    where: {
      domain: user.coreDomain,
      [Op.or]: [{ subdomain: null }, { subdomain: user.subdomain }],
    },
  });

  res.json(notices);
};
