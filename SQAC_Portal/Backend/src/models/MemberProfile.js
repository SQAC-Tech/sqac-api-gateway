import mongoose from "mongoose";

const memberProfileSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    yearOfStudy: { type: String },

    // "Technical" or "Corporate" — set during onboarding
    coreDomain: {
      type: String,
      enum: ["Technical", "Corporate"],
      default: "Technical",
    },

    // For Technical: "Web Development", "AI/ML", or both
    techSubDomain: { type: String, default: "" },

    // For Corporate: sub-domain
    corpSubDomain: {
      type: String,
      enum: ["", "Events", "Media", "Public Relations", "Sponsorships", "Creatives"],
      default: "",
    },

    // ── Technical Skills (0-5 scale) ──────────────────────────────
    skills: {
      html: { type: Number, default: 0 },
      css: { type: Number, default: 0 },
      javascript: { type: Number, default: 0 },
      react: { type: Number, default: 0 },
      nextjs: { type: Number, default: 0 },
      angular: { type: Number, default: 0 },
      vue: { type: Number, default: 0 },
      tailwind: { type: Number, default: 0 },
      bootstrap: { type: Number, default: 0 },
      api: { type: Number, default: 0 },
      graphql: { type: Number, default: 0 },
      nodejs: { type: Number, default: 0 },
      express: { type: Number, default: 0 },
      fastapi: { type: Number, default: 0 },
      django: { type: Number, default: 0 },
      flask: { type: Number, default: 0 },
      java: { type: Number, default: 0 },
      spring: { type: Number, default: 0 },
      authentication: { type: Number, default: 0 },
      apiDesign: { type: Number, default: 0 },
      systemDesign: { type: Number, default: 0 },
      sql: { type: Number, default: 0 },
      mongodb: { type: Number, default: 0 },
      redis: { type: Number, default: 0 },
      cpp: { type: Number, default: 0 },
      javaProg: { type: Number, default: 0 },
      python: { type: Number, default: 0 },
      numpy: { type: Number, default: 0 },
      pandas: { type: Number, default: 0 },
      scikitlearn: { type: Number, default: 0 },
      tensorflow: { type: Number, default: 0 },
      pytorch: { type: Number, default: 0 },
      deepLearning: { type: Number, default: 0 },
      nlp: { type: Number, default: 0 },
      computerVision: { type: Number, default: 0 },
      dataAnalysis: { type: Number, default: 0 },
      modelEvaluation: { type: Number, default: 0 },
      llm: { type: Number, default: 0 },
      generativeAi: { type: Number, default: 0 },
      rag: { type: Number, default: 0 },
      langchain: { type: Number, default: 0 },
      huggingface: { type: Number, default: 0 },
      transformers: { type: Number, default: 0 },
      promptEngineering: { type: Number, default: 0 },
      github: { type: Number, default: 0 },
      docker: { type: Number, default: 0 },
      cicd: { type: Number, default: 0 },
      linux: { type: Number, default: 0 },
      aws: { type: Number, default: 0 },
      deployment: { type: Number, default: 0 },
    },

    // ── Corporate Skills (0-5 scale) ─────────────────────────────
    corpSkills: {
      // Events
      eventPlanning: { type: Number, default: 0 },
      venueManagement: { type: Number, default: 0 },
      budgeting: { type: Number, default: 0 },
      vendorCoordination: { type: Number, default: 0 },
      logistics: { type: Number, default: 0 },
      // Media
      contentWriting: { type: Number, default: 0 },
      socialMediaMgmt: { type: Number, default: 0 },
      videoEditing: { type: Number, default: 0 },
      photography: { type: Number, default: 0 },
      seoMarketing: { type: Number, default: 0 },
      // Public Relations
      communication: { type: Number, default: 0 },
      outreach: { type: Number, default: 0 },
      networking: { type: Number, default: 0 },
      publicSpeaking: { type: Number, default: 0 },
      crisisManagement: { type: Number, default: 0 },
      // Sponsorships
      pitchDecks: { type: Number, default: 0 },
      negotiation: { type: Number, default: 0 },
      brandPartnerships: { type: Number, default: 0 },
      fundraising: { type: Number, default: 0 },
      proposalWriting: { type: Number, default: 0 },
      // Creatives
      graphicDesign: { type: Number, default: 0 },
      uiuxDesign: { type: Number, default: 0 },
      motionGraphics: { type: Number, default: 0 },
      branding: { type: Number, default: 0 },
      illustration: { type: Number, default: 0 },
    },

    // ── Computed Scores ──────────────────────────────────────────
    webdevScore: { type: Number, default: 0 },
    aimlScore: { type: Number, default: 0 },
    corpScore: { type: Number, default: 0 },
    overallScore: { type: Number, default: 0 },

    // Tier classification
    webdevTier: { type: String, enum: ["senior", "mid", "rookie"], default: "rookie" },
    aimlTier: { type: String, enum: ["senior", "mid", "rookie"], default: "rookie" },
    corpTier: { type: String, enum: ["senior", "mid", "rookie"], default: "rookie" },

    // Availability
    hoursPerWeek: { type: String, default: "01-Feb" },
    preferredWork: { type: String },
    workPreference: { type: String },
    wantToLearn: { type: String },
    hasBuiltProjects: { type: Boolean, default: false },

    // Assignment status
    status: {
      type: String,
      enum: ["available", "assigned", "on_break"],
      default: "available",
    },
    currentProjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true },
);

// Compute scores before saving
memberProfileSchema.pre("save", function () {
  const s = this.skills || {};
  const c = this.corpSkills || {};

  // WebDev score
  const wSkills = [
    s.html, s.css, s.javascript, s.react, s.nextjs, s.angular, s.vue,
    s.tailwind, s.bootstrap, s.api, s.graphql, s.nodejs, s.express,
    s.fastapi, s.django, s.flask, s.java, s.spring, s.authentication,
    s.apiDesign, s.systemDesign, s.sql, s.mongodb, s.redis,
  ];
  const wMax = wSkills.length * 5;
  this.webdevScore = Math.round((wSkills.reduce((a, b) => a + (b || 0), 0) / wMax) * 100) || 0;

  // AIML score
  const aSkills = [
    s.cpp, s.javaProg, s.python, s.numpy, s.pandas, s.scikitlearn,
    s.tensorflow, s.pytorch, s.deepLearning, s.nlp, s.computerVision,
    s.dataAnalysis, s.modelEvaluation, s.llm, s.generativeAi, s.rag,
    s.langchain, s.huggingface, s.transformers, s.promptEngineering,
  ];
  const aMax = aSkills.length * 5;
  this.aimlScore = Math.round((aSkills.reduce((a, b) => a + (b || 0), 0) / aMax) * 100) || 0;

  // Corporate score
  const cSkills = [
    c.eventPlanning, c.venueManagement, c.budgeting, c.vendorCoordination, c.logistics,
    c.contentWriting, c.socialMediaMgmt, c.videoEditing, c.photography, c.seoMarketing,
    c.communication, c.outreach, c.networking, c.publicSpeaking, c.crisisManagement,
    c.pitchDecks, c.negotiation, c.brandPartnerships, c.fundraising, c.proposalWriting,
    c.graphicDesign, c.uiuxDesign, c.motionGraphics, c.branding, c.illustration,
  ];
  const cMax = cSkills.length * 5;
  this.corpScore = Math.round((cSkills.reduce((a, b) => a + (b || 0), 0) / cMax) * 100) || 0;

  // Overall = relevant domain score
  if (this.coreDomain === "Corporate") {
    this.overallScore = this.corpScore;
  } else {
    this.overallScore = Math.round((this.webdevScore + this.aimlScore) / 2);
  }

  // Tier classification
  const tierOf = (score) => (score >= 55 ? "senior" : score >= 30 ? "mid" : "rookie");
  this.webdevTier = tierOf(this.webdevScore);
  this.aimlTier = tierOf(this.aimlScore);
  this.corpTier = tierOf(this.corpScore);
});

export default mongoose.model("MemberProfile", memberProfileSchema);
