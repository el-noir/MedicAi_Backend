import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { Prediction } from "../models/prediction.model.js"

// Create a new prediction
const createPrediction = asyncHandler(async (req, res) => {
  const { symptoms, additionalInfo, result, flaskResponse } = req.body

  // Validate required fields
  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    throw new ApiError(400, "Symptoms array is required and cannot be empty")
  }

  if (!result || !result.prediction) {
    throw new ApiError(400, "Prediction result is required")
  }

  try {
    // Create prediction document
    const prediction = await Prediction.create({
      user: req.user._id,
      symptoms,
      additionalInfo: additionalInfo || {},
      result: {
        prediction: result.prediction,
        confidence: result.confidence || 0,
        recommendations: result.recommendations || [],
        riskLevel: result.riskLevel || "Low",
      },
      flaskResponse: flaskResponse || {},
    })

    // Populate user information
    await prediction.populate("user", "fullName email username")

    return res.status(201).json(new ApiResponse(201, prediction, "Prediction saved successfully"))
  } catch (error) {
    console.error("Error creating prediction:", error)
    throw new ApiError(500, "Failed to save prediction")
  }
})

// Get user's predictions
const getUserPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, sortBy = "timestamp", sortOrder = "desc" } = req.query

  try {
    const skip = (Number.parseInt(page) - 1) * Number.parseInt(limit)
    const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 }

    const predictions = await Prediction.find({
      user: req.user._id,
      isDeleted: false,
    })
      .sort(sort)
      .skip(skip)
      .limit(Number.parseInt(limit))
      .populate("user", "fullName email username")

    const totalPredictions = await Prediction.countDocuments({
      user: req.user._id,
      isDeleted: false,
    })

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          predictions,
          totalPredictions,
          currentPage: Number.parseInt(page),
          totalPages: Math.ceil(totalPredictions / Number.parseInt(limit)),
          hasNextPage: skip + predictions.length < totalPredictions,
          hasPrevPage: Number.parseInt(page) > 1,
        },
        "Predictions fetched successfully",
      ),
    )
  } catch (error) {
    console.error("Error fetching predictions:", error)
    throw new ApiError(500, "Failed to fetch predictions")
  }
})

// Get single prediction
const getPredictionById = asyncHandler(async (req, res) => {
  const { predictionId } = req.params

  try {
    const prediction = await Prediction.findOne({
      _id: predictionId,
      user: req.user._id,
      isDeleted: false,
    }).populate("user", "fullName email username")

    if (!prediction) {
      throw new ApiError(404, "Prediction not found")
    }

    return res.status(200).json(new ApiResponse(200, prediction, "Prediction fetched successfully"))
  } catch (error) {
    console.error("Error fetching prediction:", error)
    throw new ApiError(500, "Failed to fetch prediction")
  }
})

// Delete prediction (soft delete)
const deletePrediction = asyncHandler(async (req, res) => {
  const { predictionId } = req.params

  try {
    const prediction = await Prediction.findOne({
      _id: predictionId,
      user: req.user._id,
      isDeleted: false,
    })

    if (!prediction) {
      throw new ApiError(404, "Prediction not found")
    }

    prediction.isDeleted = true
    await prediction.save()

    return res.status(200).json(new ApiResponse(200, {}, "Prediction deleted successfully"))
  } catch (error) {
    console.error("Error deleting prediction:", error)
    throw new ApiError(500, "Failed to delete prediction")
  }
})

// Get prediction statistics
const getPredictionStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user._id

    // Get total predictions
    const totalPredictions = await Prediction.countDocuments({
      user: userId,
      isDeleted: false,
    })

    // Get predictions this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const thisMonthPredictions = await Prediction.countDocuments({
      user: userId,
      isDeleted: false,
      timestamp: { $gte: startOfMonth },
    })

    // Get average confidence
    const avgConfidenceResult = await Prediction.aggregate([
      {
        $match: {
          user: userId,
          isDeleted: false,
          "result.confidence": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          avgConfidence: { $avg: "$result.confidence" },
        },
      },
    ])

    const avgConfidence = avgConfidenceResult.length > 0 ? Math.round(avgConfidenceResult[0].avgConfidence) : 0

    // Get risk level distribution
    const riskDistribution = await Prediction.aggregate([
      {
        $match: {
          user: userId,
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: "$result.riskLevel",
          count: { $sum: 1 },
        },
      },
    ])

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          totalPredictions,
          thisMonthPredictions,
          avgConfidence,
          riskDistribution,
        },
        "Prediction statistics fetched successfully",
      ),
    )
  } catch (error) {
    console.error("Error fetching prediction stats:", error)
    throw new ApiError(500, "Failed to fetch prediction statistics")
  }
})

export { createPrediction, getUserPredictions, getPredictionById, deletePrediction, getPredictionStats }
