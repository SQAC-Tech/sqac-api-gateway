import jwt from "jsonwebtoken";
import User from "../models/User.js";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import sendMail from "../lib/mailer.js";
import {
  registrationReceivedEmail,
  newRegistrationAlertEmail,
  onboardingConfirmationEmail,
} from "../lib/email-templates.js";
dotenv.config();

const generateToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const authenticateToken = async (req, res, next) => {
  const token = req.cookies.session;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    req.userId = decoded.userId;
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid session" });
  }
};

const createUser = async (req, res) => {
  try {
    const VALID_ROLES = ['secretary','joint_secretary','technical_lead','project_lead','corp_lead','domain_lead','associate_lead','member'];

    let {
      name,
      regNum,
      email,
      phoneNumber,
      password,
      coreDomain,
      subDomain,
      role,
      address,
      socials,
      bio,
    } = req.body;

    if (!name || !regNum || !email || !password || !coreDomain) {
      return res.status(400).json({ error: "Required fields missing" });
    }

    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role selected" });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long",
      });
    }

    email = email.trim().toLowerCase();
    regNum = regNum.trim();

    const existingUser = await User.findOne({
      $or: [{ email }, { regNum }],
    });

    if (existingUser) {
      return res.status(409).json({
        error: "User with this email or registration number already exists",
      });
    }
    const hashedPassword = await bcrypt.hash(password, 15);

    const user = await User.create({
      name,
      regNum,
      email,
      phoneNumber,
      password: hashedPassword,
      coreDomain,
      subDomain,
      role: role || "member",
      address,
      socials,
      bio,
    });

    // Send "Registration Received" email to member
    try {
      await sendMail({
        to: user.email,
        subject: "SQAC Portal — Application Received (Pending Approval)",
        html: registrationReceivedEmail(user),
      });
    } catch (mailErr) {
      console.error("Failed to send registration email to member:", mailErr);
    }

    // Notify all Secretaries about the new registration
    try {
      const secretaries = await User.find({ role: "secretary" }, "email").lean();
      for (const sec of secretaries) {
        await sendMail({
          to: sec.email,
          subject: `SQAC Portal — New Registration: ${user.name}`,
          html: newRegistrationAlertEmail(user),
        }).catch((e) => console.error(`Failed to notify secretary ${sec.email}:`, e));
      }
    } catch (mailErr) {
      console.error("Failed to notify secretaries:", mailErr);
    }

    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        regNum: user.regNum,
        coreDomain: user.coreDomain,
      },
    });
  } catch (err) {
    console.error("REGISTER ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const loginUser = async (req, res) => {
  try {
    let { email, password } = req.body;

    email = email?.trim().toLowerCase();

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const debugInfo = { email: user.email, approved: user.approved, isFalse: user.approved === false };

    if (user.approved === false || user.approved === undefined || !user.approved) {
      return res.status(403).json({ error: "Your account is pending approval by the Secretary.", debugInfo });
    }

    const token = generateToken(user._id);

    res.cookie("session", token, {
      httpOnly: true,
      sameSite: "none",
      secure: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: "Login successful",
      debugInfo,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        regNum: user.regNum,
        coreDomain: user.coreDomain,
        subDomain: user.subDomain,
        role: user.role,
        cocAccepted: user.cocAccepted === true,
        profileCompleted: user.profileCompleted === true,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

const logoutUser = (req, res) => {
  res.clearCookie("session");
  res.json({ message: "Logged out" });
};

const getrole = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ role: req.user.role });
  } catch (error) {
    console.error("GET ROLE ERROR:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * POST /api/auth/complete-onboarding (public — no auth needed)
 * Verifies user identity via userId + email combo.
 * Marks undertaking + CoC as signed and sets isOnboarded = true.
 */
const completeOnboarding = async (req, res) => {
  try {
    const { userId, email, undertakingSigned, cocSigned } = req.body;

    if (!userId || !email) {
      return res.status(400).json({ error: "userId and email are required" });
    }

    const user = await User.findOne({ _id: userId, email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (user.approved) {
      return res.status(400).json({ error: "Account is already approved" });
    }

    if (user.isOnboarded) {
      return res.status(400).json({ error: "Onboarding already completed" });
    }

    user.undertakingSigned = undertakingSigned === true;
    user.cocSigned = cocSigned === true;
    user.isOnboarded = (user.undertakingSigned && user.cocSigned);
    await user.save();

    // Confirm onboarding to the user
    sendMail({
      to: user.email,
      subject: "SQAC Portal — Application Submitted Successfully",
      html: onboardingConfirmationEmail(user),
    }).catch((e) => console.error("Failed to send onboarding confirmation to user:", e));

    // Notify secretaries that onboarding is complete
    try {
      const secretaries = await User.find({ role: "secretary" }, "email").lean();
      for (const sec of secretaries) {
        sendMail({
          to: sec.email,
          subject: `SQAC Portal — ${user.name} completed onboarding`,
          html: newRegistrationAlertEmail(user),
        }).catch((e) => console.error(`Failed to notify secretary ${sec.email}:`, e));
      }
    } catch (mailErr) {
      console.error("Failed to notify secretaries about onboarding:", mailErr);
    }

    res.json({ message: "Onboarding completed successfully. Awaiting admin approval." });
  } catch (err) {
    console.error("COMPLETE ONBOARDING ERROR:", err);
    res.status(500).json({ error: "Server error" });
  }
};

export { createUser, loginUser, logoutUser, authenticateToken, getrole, completeOnboarding };
