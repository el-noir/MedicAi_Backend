import mongoose from "mongoose"

const sharedPredictionSchema = new mongoose.Schema(
  {
    predictionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shareCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    message: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["active", "responded", "revoked"],
      default: "active",
    },
    doctorResponse: {
      type: String,
      default: "",
    },
    doctorRecommendations: [
      {
        type: String,
      },
    ],
    lastViewedAt: {
      type: Date,
    },
    respondedAt: {
      type: Date,
    },
    revokedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

// Index for efficient queries
sharedPredictionSchema.index({ userId: 1, createdAt: -1 })
sharedPredictionSchema.index({ doctorId: 1, status: 1, createdAt: -1 })
sharedPredictionSchema.index({ shareCode: 1, doctorId: 1 })

export const SharedPrediction = mongoose.model("SharedPrediction", sharedPredictionSchema)
