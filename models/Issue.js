const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "pothole",
        "garbage",
        "streetlight",
        "water_leakage",
        "electricity",
        "drainage",
        "road_damage",
        "other",
      ],
      required: true,
    },
    // AI-suggested category (may differ from what user picked)
    aiSuggestedCategory: {
      type: String,
      default: null,
    },
    aiConfidence: {
      type: Number,
      default: null,
    },
    aiVerification: {
      type: String,
      enum: ["VALID", "NEEDS_REVIEW", "REJECTED"],
      default: null,
    },

    aiIsCivic: {
      type: Boolean,
      default: null,
    },

    aiRecommendation: {
      type: String,
      enum: ["ACCEPT", "MANUAL_REVIEW", "REJECT"],
      default: null,
    },
    images: [
      {
        url: String,
        filename: String,
      },
    ],
    imageHash: {
      type: String,
      default: null,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      type: String,
      default: "",
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["reported", "acknowledged", "in_progress", "resolved", "rejected"],
      default: "reported",
    },
    priority: {
      type: Number,
      default: 1, // 1 = low, 2 = medium, 3 = high, auto-calculated
    },
    upvotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Issue",
      default: null,
    },
    duplicateReason: {
      type: String,
      enum: ["image", "location", "both", null],
      default: null,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    assignedDept: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },
    assignedStaff: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
      },
    ],
    slaDeadline: {
      type: Date,
      default: null,
    },
    escalated: {
      type: Boolean,
      default: false,
    },

    escalatedAt: {
      type: Date,
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    feedback: {
      rating: {
        type: Number,
        min: 1,
        max: 5,
        default: null,
      },
      comment: {
        type: String,
        default: "",
      },
      submittedAt: {
        type: Date,
        default: null,
      },
    },
    resolutionImage: {
      url: String,
      filename: String,
    },
  },
  { timestamps: true }
);

// Geospatial index - required for "find nearby issues" (duplicate detection + map queries)
issueSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Issue", issueSchema);
