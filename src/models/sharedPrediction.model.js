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
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "responded", "revoked"],
      default: "pending",
    },
    doctorResponse: {
      type: String,
      maxlength: 1000,
    },
    doctorRecommendations: [
      {
        type: String,
        maxlength: 200,
      },
    ],
    viewedAt: {
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

// Indexes for efficient queries
sharedPredictionSchema.index({ userId: 1, createdAt: -1 })
sharedPredictionSchema.index({ doctorId: 1, createdAt: -1 })
sharedPredictionSchema.index({ shareCode: 1 })
sharedPredictionSchema.index({ status: 1 })

export const SharedPrediction = mongoose.model("SharedPrediction", sharedPredictionSchema)
