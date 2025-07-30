import mongoose from "mongoose"

const predictionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Input features
    age: {
      type: Number,
      required: true,
      min: 0,
      max: 120,
    },
    sex: {
      type: String,
      required: true,
      enum: ["M", "F"],
    },
    cp: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    trestbps: {
      type: Number,
      required: true,
      min: 80,
      max: 200,
    },
    chol: {
      type: Number,
      required: true,
      min: 100,
      max: 600,
    },
    fbs: {
      type: Number,
      required: true,
      enum: [0, 1],
    },
    restecg: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    thalach: {
      type: Number,
      required: true,
      min: 60,
      max: 220,
    },
    exang: {
      type: Number,
      required: true,
      enum: [0, 1],
    },
    oldpeak: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    slope: {
      type: Number,
      required: true,
      min: 0,
      max: 2,
    },
    ca: {
      type: Number,
      required: true,
      min: 0,
      max: 4,
    },
    thal: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    // Prediction results
    prediction: {
      type: Number,
      required: true,
      enum: [0, 1], // 0 = No heart disease, 1 = Heart disease
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    riskLevel: {
      type: String,
      required: true,
      enum: ["Low", "Medium", "High"],
    },
    // Additional metadata
    notes: {
      type: String,
      maxlength: 1000,
    },
    isShared: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
predictionSchema.index({ userId: 1, createdAt: -1 })
predictionSchema.index({ prediction: 1 })
predictionSchema.index({ riskLevel: 1 })

export const Prediction = mongoose.model("Prediction", predictionSchema)
