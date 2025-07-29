import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { SharedPrediction } from "../models/sharedPrediction.model.js"
import { Prediction } from "../models/prediction.model.js"
import { User } from "../models/user.model.js"
import { sendPredictionShareEmail, sendDoctorNotificationEmail } from "../utils/emailService.js"
import crypto from "crypto"

// Generate unique share code
const generateShareCode = () => {
  return crypto.randomBytes(16).toString("hex")
}

// Share prediction with doctor
const sharePredictionWithDoctor = asyncHandler(async (req, res) => {
  const { predictionId, doctorEmail, message } = req.body

  // Validate required fields
  if (!predictionId || !doctorEmail) {
    throw new ApiError(400, "Prediction ID and doctor email are required")
  }

  try {
    // Check if prediction exists and belongs to user
    const prediction = await Prediction.findOne({
      _id: predictionId,
      user: req.user._id,
      isDeleted: false,
    })

    if (!prediction) {
      throw new ApiError(404, "Prediction not found")
    }

    // Find doctor by email
    const doctor = await User.findOne({
      email: doctorEmail.toLowerCase(),
      role: "doctor",
      isVerified: true,
    })

    if (!doctor) {
      throw new ApiError(404, "Doctor not found or not verified")
    }

    // Check if already shared with this doctor
    const existingShare = await SharedPrediction.findOne({
      prediction: predictionId,
      patient: req.user._id,
      doctor: doctor._id,
      isActive: true,
    })

    if (existingShare) {
      throw new ApiError(400, "Prediction already shared with this doctor")
    }

    // Create shared prediction
    const shareCode = generateShareCode()
    const sharedPrediction = await SharedPrediction.create({
      prediction: predictionId,
      patient: req.user._id,
      doctor: doctor._id,
      shareCode,
      message: message || "",
    })

    // Populate the shared prediction
    await sharedPrediction.populate([
      { path: "prediction" },
      { path: "patient", select: "fullName email" },
      { path: "doctor", select: "fullName email specialization" },
    ])

    // Send notification emails
    try {
      await sendPredictionShareEmail(req.user, doctor, sharedPrediction)
      await sendDoctorNotificationEmail(doctor, req.user, sharedPrediction)
    } catch (emailError) {
      console.error("Failed to send notification emails:", emailError)
    }

    return res.status(201).json(new ApiResponse(201, sharedPrediction, "Prediction shared successfully with doctor"))
  } catch (error) {
    console.error("Error sharing prediction:", error)
    throw new ApiError(500, "Failed to share prediction")
  }
})

// Get user's shared predictions
const getUserSharedPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query

  try {
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)

    const sharedPredictions = await SharedPrediction.find({
      patient: req.user._id,
      isActive: true,
    })
      .populate([{ path: "prediction" }, { path: "doctor", select: "fullName email specialization experience" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const totalShared = await SharedPrediction.countDocuments({
      patient: req.user._id,
      isActive: true,
    })

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          sharedPredictions,
          totalShared,
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalShared / Number.parseInt(limit)),
        },
        "Shared predictions fetched successfully",
      ),
    )
  } catch (error) {
    console.error("Error fetching shared predictions:", error)
    throw new ApiError(500, "Failed to fetch shared predictions")
  }
})

// Get doctor's received predictions
const getDoctorReceivedPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = "all" } = req.query

  try {
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const filter = {
      doctor: req.user._id,
      isActive: true,
    }

    if (status !== "all") {
      filter.status = status
    }

    const receivedPredictions = await SharedPrediction.find(filter)
      .populate([{ path: "prediction" }, { path: "patient", select: "fullName email age" }])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const totalReceived = await SharedPrediction.countDocuments(filter)

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          receivedPredictions,
          totalReceived,
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalReceived / Number.parseInt(limit)),
        },
        "Received predictions fetched successfully",
      ),
    )
  } catch (error) {
    console.error("Error fetching received predictions:", error)
    throw new ApiError(500, "Failed to fetch received predictions")
  }
})

// View shared prediction (for doctors)
const viewSharedPrediction = asyncHandler(async (req, res) => {
  const { shareCode } = req.params

  try {
    const sharedPrediction = await SharedPrediction.findOne({
      shareCode,
      doctor: req.user._id,
      isActive: true,
    }).populate([{ path: "prediction" }, { path: "patient", select: "fullName email age" }])

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found or access denied")
    }

    // Mark as viewed if not already viewed
    if (!sharedPrediction.viewedAt) {
      sharedPrediction.viewedAt = new Date()
      sharedPrediction.status = "viewed"
      await sharedPrediction.save()
    }

    return res.status(200).json(new ApiResponse(200, sharedPrediction, "Shared prediction fetched successfully"))
  } catch (error) {
    console.error("Error viewing shared prediction:", error)
    throw new ApiError(500, "Failed to view shared prediction")
  }
})

// Doctor response to shared prediction
const respondToSharedPrediction = asyncHandler(async (req, res) => {
  const { shareCode } = req.params
  const { message, recommendations, followUpRequired } = req.body

  if (!message) {
    throw new ApiError(400, "Response message is required")
  }

  try {
    const sharedPrediction = await SharedPrediction.findOne({
      shareCode,
      doctor: req.user._id,
      isActive: true,
    }).populate([{ path: "prediction" }, { path: "patient", select: "fullName email" }])

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found or access denied")
    }

    // Update with doctor's response
    sharedPrediction.doctorResponse = {
      message,
      recommendations: recommendations || [],
      followUpRequired: followUpRequired || false,
      respondedAt: new Date(),
    }
    sharedPrediction.status = "responded"

    await sharedPrediction.save()

    // Send notification to patient
    try {
      // You can implement sendDoctorResponseEmail function
      console.log("Doctor response saved, notification should be sent to patient")
    } catch (emailError) {
      console.error("Failed to send response notification:", emailError)
    }

    return res.status(200).json(new ApiResponse(200, sharedPrediction, "Response sent successfully"))
  } catch (error) {
    console.error("Error responding to shared prediction:", error)
    throw new ApiError(500, "Failed to send response")
  }
})

// Revoke shared prediction access
const revokeSharedPrediction = asyncHandler(async (req, res) => {
  const { shareId } = req.params

  try {
    const sharedPrediction = await SharedPrediction.findOne({
      _id: shareId,
      patient: req.user._id,
    })

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found")
    }

    sharedPrediction.isActive = false
    await sharedPrediction.save()

    return res.status(200).json(new ApiResponse(200, {}, "Access revoked successfully"))
  } catch (error) {
    console.error("Error revoking shared prediction:", error)
    throw new ApiError(500, "Failed to revoke access")
  }
})

export {
  sharePredictionWithDoctor,
  getUserSharedPredictions,
  getDoctorReceivedPredictions,
  viewSharedPrediction,
  respondToSharedPrediction,
  revokeSharedPrediction,
}
