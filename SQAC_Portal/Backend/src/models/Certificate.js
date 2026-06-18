import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    credentialId: {
      type: String,
      unique: true,
      required: true,
    },
    issuedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    issuedToName: {
      type: String,
      required: true,
    },
    issuedToEmail: {
      type: String,
      required: true,
    },
    issuedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['participation', 'completion', 'appreciation', 'custom'],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: String,
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    imageUrl: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for efficient lookups
certificateSchema.index({ issuedTo: 1, issuedAt: -1 });
certificateSchema.index({ credentialId: 1 });

export default mongoose.model('Certificate', certificateSchema);
