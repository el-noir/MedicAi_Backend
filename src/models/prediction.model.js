import mongoose from "mongoose"

const predictionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    symptoms: [
      {
        type: String,
        required: true,
      },
    ],
    additionalInfo: {
      age: Number,
      gender: String,
      duration: String,
      severity: String,
    },
    result: {
      prediction: String,
      confidence: Number,
      recommendations: [String],
      riskLevel: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Low",
      },
    },
    flaskResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
)

// Index for faster queries
predictionSchema.index({ user: 1, timestamp: -1 })
predictionSchema.index({ user: 1, isDeleted: 1 })

export const Prediction = mongoose.model("Prediction", predictionSchema)
