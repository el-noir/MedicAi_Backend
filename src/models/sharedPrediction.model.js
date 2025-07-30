import mongoose from "mongoose"

const sharedPredictionSchema = new mongoose.Schema(
  {
    prediction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prediction",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    shareCode: {
      type: String,
      required: true,
      unique: true,
    },
    message: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "viewed", "responded"],
      default: "pending",
    },
    doctorResponse: {
      message: String,
      recommendations: [String],
      followUpRequired: {
        type: Boolean,
        default: false,
      },
      respondedAt: Date,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
    viewedAt: Date,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
)

// Index for faster queries
sharedPredictionSchema.index({ patient: 1, doctor: 1 })
sharedPredictionSchema.index({ shareCode: 1 })
sharedPredictionSchema.index({ doctor: 1, status: 1 })
sharedPredictionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const SharedPrediction = mongoose.model("SharedPrediction", sharedPredictionSchema)