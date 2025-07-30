import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { SharedPrediction } from "../models/sharedPrediction.model.js"
import { Prediction } from "../models/prediction.model.js"
import { User } from "../models/user.model.js"
import { sendEmail } from "../utils/emailService.js"
import crypto from "crypto"

// Share prediction with doctor
const sharePrediction = asyncHandler(async (req, res) => {
  const { predictionId, doctorEmail, message } = req.body

  if (!predictionId || !doctorEmail) {
    throw new ApiError(400, "Prediction ID and doctor email are required")
  }

  // Verify prediction exists and belongs to user
  const prediction = await Prediction.findOne({
    _id: predictionId,
    userId: req.user._id,
  })

  if (!prediction) {
    throw new ApiError(404, "Prediction not found")
  }

  // Find doctor by email
  const doctor = await User.findOne({
    email: doctorEmail,
    role: "doctor",
  })

  if (!doctor) {
    throw new ApiError(404, "Doctor not found with this email")
  }

  // Generate unique share code
  const shareCode = crypto.randomBytes(16).toString("hex")

  // Create shared prediction
  const sharedPrediction = await SharedPrediction.create({
    predictionId: prediction._id,
    userId: req.user._id,
    doctorId: doctor._id,
    shareCode,
    message: message || "",
    status: "pending",
  })

  // Send email notification to doctor
  try {
    await sendEmail({
      to: doctor.email,
      subject: "New Prediction Shared with You",
      html: `
        <h2>New Medical Prediction Shared</h2>
        <p>Hello Dr. ${doctor.fullName},</p>
        <p>${req.user.fullName} has shared a medical prediction with you.</p>
        ${message ? `<p><strong>Message:</strong> ${message}</p>` : ""}
        <p>Share Code: <strong>${shareCode}</strong></p>
        <p>Please log in to your account to view the details.</p>
      `,
    })
  } catch (emailError) {
    console.error("Failed to send email notification:", emailError)
    // Don't fail the request if email fails
  }

  return res.status(201).json(new ApiResponse(201, sharedPrediction, "Prediction shared successfully"))
})

// Get user's shared predictions
const getUserSharedPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  const sharedPredictions = await SharedPrediction.find({
    userId: req.user._id,
  })
    .populate("predictionId")
    .populate("doctorId", "fullName email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await SharedPrediction.countDocuments({
    userId: req.user._id,
  })

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        sharedPredictions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
      "Shared predictions fetched successfully",
    ),
  )
})

// Get doctor's received predictions
const getDoctorReceivedPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status } = req.query

  const filter = { doctorId: req.user._id }
  if (status) {
    filter.status = status
  }

  const receivedPredictions = await SharedPrediction.find(filter)
    .populate("predictionId")
    .populate("userId", "fullName email")
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit)

  const total = await SharedPrediction.countDocuments(filter)

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        receivedPredictions,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total,
      },
      "Received predictions fetched successfully",
    ),
  )
})

// View shared prediction by share code
const viewSharedPrediction = asyncHandler(async (req, res) => {
  const { shareCode } = req.params

  const sharedPrediction = await SharedPrediction.findOne({
    shareCode,
    doctorId: req.user._id,
    status: { $ne: "revoked" },
  })
    .populate("predictionId")
    .populate("userId", "fullName email")

  if (!sharedPrediction) {
    throw new ApiError(404, "Shared prediction not found or access denied")
  }

  // Mark as viewed if not already
  if (sharedPrediction.status === "pending") {
    sharedPrediction.status = "viewed"
    sharedPrediction.viewedAt = new Date()
    await sharedPrediction.save()
  }

  return res.status(200).json(new ApiResponse(200, sharedPrediction, "Shared prediction fetched successfully"))
})

// Respond to shared prediction
const respondToSharedPrediction = asyncHandler(async (req, res) => {
  const { shareCode } = req.params
  const { response, recommendations } = req.body

  if (!response) {
    throw new ApiError(400, "Response is required")
  }

  const sharedPrediction = await SharedPrediction.findOne({
    shareCode,
    doctorId: req.user._id,
    status: { $ne: "revoked" },
  }).populate("userId", "fullName email")

  if (!sharedPrediction) {
    throw new ApiError(404, "Shared prediction not found or access denied")
  }

  // Update shared prediction with doctor's response
  sharedPrediction.doctorResponse = response
  sharedPrediction.doctorRecommendations = recommendations || []
  sharedPrediction.status = "responded"
  sharedPrediction.respondedAt = new Date()
  await sharedPrediction.save()

  // Send email notification to patient
  try {
    await sendEmail({
      to: sharedPrediction.userId.email,
      subject: "Doctor Response to Your Shared Prediction",
      html: `
        <h2>Doctor Response Received</h2>
        <p>Hello ${sharedPrediction.userId.fullName},</p>
        <p>Dr. ${req.user.fullName} has responded to your shared medical prediction.</p>
        <p><strong>Response:</strong> ${response}</p>
        ${
          recommendations && recommendations.length > 0
            ? `<p><strong>Recommendations:</strong></p><ul>${recommendations.map((rec) => `<li>${rec}</li>`).join("")}</ul>`
            : ""
        }
        <p>Please log in to your account to view the full details.</p>
      `,
    })
  } catch (emailError) {
    console.error("Failed to send email notification:", emailError)
  }

  return res.status(200).json(new ApiResponse(200, sharedPrediction, "Response submitted successfully"))
})

// Revoke shared prediction access
const revokeSharedPrediction = asyncHandler(async (req, res) => {
  const { shareId } = req.params

  const sharedPrediction = await SharedPrediction.findOne({
    _id: shareId,
    userId: req.user._id,
  })

  if (!sharedPrediction) {
    throw new ApiError(404, "Shared prediction not found")
  }

  sharedPrediction.status = "revoked"
  sharedPrediction.revokedAt = new Date()
  await sharedPrediction.save()

  return res.status(200).json(new ApiResponse(200, sharedPrediction, "Shared prediction access revoked"))
})

export {
  sharePrediction,
  getUserSharedPredictions,
  getDoctorReceivedPredictions,
  viewSharedPrediction,
  respondToSharedPrediction,
  revokeSharedPrediction,
}
