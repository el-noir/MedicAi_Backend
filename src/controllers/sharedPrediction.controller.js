import { SharedPrediction } from "../models/sharedPrediction.model.js"
import { Prediction } from "../models/prediction.model.js"
import { User } from "../models/user.model.js"
import { ApiError, ApiResponse } from "../utils/index.js"
import { sendEmail } from "../utils/emailService.js"
import crypto from "crypto"

// Generate unique share code
const generateShareCode = () => {
  return crypto.randomBytes(16).toString("hex")
}

// Share prediction with doctor
export const sharePrediction = async (req, res, next) => {
  try {
    const { predictionId, doctorEmail, message } = req.body
    const userId = req.user._id

    // Validate required fields
    if (!predictionId || !doctorEmail) {
      throw new ApiError(400, "Prediction ID and doctor email are required")
    }

    // Check if prediction exists and belongs to user
    const prediction = await Prediction.findOne({
      _id: predictionId,
      userId: userId,
    })

    if (!prediction) {
      throw new ApiError(404, "Prediction not found or access denied")
    }

    // Check if doctor exists
    const doctor = await User.findOne({
      email: doctorEmail,
      role: "doctor",
    }).select("-password -refreshToken")

    if (!doctor) {
      throw new ApiError(404, "Doctor not found with this email address")
    }

    // Check if already shared with this doctor
    const existingShare = await SharedPrediction.findOne({
      predictionId,
      doctorId: doctor._id,
      status: "active",
    })

    if (existingShare) {
      throw new ApiError(400, "Prediction already shared with this doctor")
    }

    // Create share code
    const shareCode = generateShareCode()

    // Create shared prediction record
    const sharedPrediction = await SharedPrediction.create({
      predictionId,
      userId,
      doctorId: doctor._id,
      shareCode,
      message: message || "",
      status: "active",
    })

    // Send email notification to doctor
    try {
      await sendEmail({
        to: doctorEmail,
        subject: "New Medical Analysis Shared With You",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0891b2;">New Medical Analysis Shared</h2>
            <p>Hello Dr. ${doctor.fullName},</p>
            <p>A patient has shared their medical analysis with you for review.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0891b2; margin-top: 0;">Analysis Details:</h3>
              <p><strong>Patient:</strong> ${req.user.fullName}</p>
              <p><strong>Analysis Date:</strong> ${new Date(prediction.timestamp).toLocaleDateString()}</p>
              <p><strong>Condition:</strong> ${prediction.result?.prediction || "N/A"}</p>
              ${message ? `<p><strong>Patient Message:</strong> ${message}</p>` : ""}
            </div>
            
            <p>Please log in to your MedicAI account to review the complete analysis.</p>
            <p>Share Code: <strong>${shareCode}</strong></p>
            
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/doctor/shared-predictions" 
                 style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Analysis
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This is an automated message from MedicAI. Please do not reply to this email.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError)
      // Don't fail the request if email fails
    }

    // Populate the response
    await sharedPrediction.populate([
      { path: "predictionId", select: "symptoms result timestamp" },
      { path: "doctorId", select: "fullName email" },
    ])

    res.status(201).json(new ApiResponse(201, sharedPrediction, "Prediction shared successfully"))
  } catch (error) {
    next(error)
  }
}

// Get user's shared predictions
export const getUserSharedPredictions = async (req, res, next) => {
  try {
    const userId = req.user._id
    const { page = 1, limit = 10 } = req.query

    const skip = (page - 1) * limit

    const sharedPredictions = await SharedPrediction.find({ userId })
      .populate([
        { path: "predictionId", select: "symptoms result timestamp" },
        { path: "doctorId", select: "fullName email" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await SharedPrediction.countDocuments({ userId })

    res.status(200).json(
      new ApiResponse(
        200,
        {
          sharedPredictions,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
          },
        },
        "Shared predictions fetched successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

// Get doctor's received predictions
export const getDoctorReceivedPredictions = async (req, res, next) => {
  try {
    const doctorId = req.user._id
    const { page = 1, limit = 10, status = "active" } = req.query

    const skip = (page - 1) * limit

    const query = { doctorId }
    if (status !== "all") {
      query.status = status
    }

    const receivedPredictions = await SharedPrediction.find(query)
      .populate([
        { path: "predictionId", select: "symptoms result timestamp" },
        { path: "userId", select: "fullName email" },
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number.parseInt(limit))

    const total = await SharedPrediction.countDocuments(query)

    res.status(200).json(
      new ApiResponse(
        200,
        {
          receivedPredictions,
          pagination: {
            currentPage: Number.parseInt(page),
            totalPages: Math.ceil(total / limit),
            totalItems: total,
            hasNextPage: page * limit < total,
            hasPrevPage: page > 1,
          },
        },
        "Received predictions fetched successfully",
      ),
    )
  } catch (error) {
    next(error)
  }
}

// View shared prediction by share code
export const viewSharedPrediction = async (req, res, next) => {
  try {
    const { shareCode } = req.params
    const doctorId = req.user._id

    const sharedPrediction = await SharedPrediction.findOne({
      shareCode,
      doctorId,
      status: "active",
    }).populate([
      { path: "predictionId", select: "symptoms result timestamp" },
      { path: "userId", select: "fullName email" },
    ])

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found or access denied")
    }

    // Update last viewed timestamp
    sharedPrediction.lastViewedAt = new Date()
    await sharedPrediction.save()

    res.status(200).json(new ApiResponse(200, sharedPrediction, "Shared prediction fetched successfully"))
  } catch (error) {
    next(error)
  }
}

// Respond to shared prediction
export const respondToSharedPrediction = async (req, res, next) => {
  try {
    const { shareCode } = req.params
    const { response, recommendations } = req.body
    const doctorId = req.user._id

    if (!response) {
      throw new ApiError(400, "Response is required")
    }

    const sharedPrediction = await SharedPrediction.findOne({
      shareCode,
      doctorId,
      status: "active",
    }).populate([
      { path: "predictionId", select: "symptoms result timestamp" },
      { path: "userId", select: "fullName email" },
    ])

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found or access denied")
    }

    // Update shared prediction with doctor's response
    sharedPrediction.doctorResponse = response
    sharedPrediction.doctorRecommendations = recommendations || []
    sharedPrediction.respondedAt = new Date()
    sharedPrediction.status = "responded"

    await sharedPrediction.save()

    // Send email notification to patient
    try {
      await sendEmail({
        to: sharedPrediction.userId.email,
        subject: "Doctor Response to Your Medical Analysis",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0891b2;">Doctor Response Received</h2>
            <p>Hello ${sharedPrediction.userId.fullName},</p>
            <p>Dr. ${req.user.fullName} has reviewed your medical analysis and provided a response.</p>
            
            <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #0891b2; margin-top: 0;">Doctor's Response:</h3>
              <p>${response}</p>
              
              ${
                recommendations && recommendations.length > 0
                  ? `
                <h4 style="color: #0891b2;">Recommendations:</h4>
                <ul>
                  ${recommendations.map((rec) => `<li>${rec}</li>`).join("")}
                </ul>
              `
                  : ""
              }
            </div>
            
            <p>Please log in to your MedicAI account to view the complete response.</p>
            
            <div style="margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/profile" 
                 style="background-color: #0891b2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Response
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This is an automated message from MedicAI. Please do not reply to this email.
            </p>
          </div>
        `,
      })
    } catch (emailError) {
      console.error("Failed to send email notification:", emailError)
    }

    res.status(200).json(new ApiResponse(200, sharedPrediction, "Response submitted successfully"))
  } catch (error) {
    next(error)
  }
}

// Revoke shared prediction access
export const revokeSharedPrediction = async (req, res, next) => {
  try {
    const { shareId } = req.params
    const userId = req.user._id

    const sharedPrediction = await SharedPrediction.findOne({
      _id: shareId,
      userId,
      status: { $ne: "revoked" },
    })

    if (!sharedPrediction) {
      throw new ApiError(404, "Shared prediction not found or already revoked")
    }

    sharedPrediction.status = "revoked"
    sharedPrediction.revokedAt = new Date()
    await sharedPrediction.save()

    res.status(200).json(new ApiResponse(200, sharedPrediction, "Prediction access revoked successfully"))
  } catch (error) {
    next(error)
  }
}
