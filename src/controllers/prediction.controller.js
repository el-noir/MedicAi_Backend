import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { Prediction } from "../models/prediction.model.js"
import mongoose from "mongoose"

// Create a new prediction
const createPrediction = asyncHandler(async (req, res) => {
  const {
    age,
    sex,
    cp,
    trestbps,
    chol,
    fbs,
    restecg,
    thalach,
    exang,
    oldpeak,
    slope,
    ca,
    thal,
    prediction,
    confidence,
    riskLevel,
    notes,
  } = req.body

  // Validate required fields
  const requiredFields = {
    age,
    sex,
    cp,
    trestbps,
    chol,
    fbs,
    restecg,
    thalach,
    exang,
    oldpeak,
    slope,
    ca,
    thal,
    prediction,
    confidence,
    riskLevel,
  }

  for (const [key, value] of Object.entries(requiredFields)) {
    if (value === undefined || value === null) {
      throw new ApiError(400, `${key} is required`)
    }
  }

  // Validate ranges
  if (age < 0 || age > 120) throw new ApiError(400, "Age must be between 0 and 120")
  if (!["M", "F"].includes(sex)) throw new ApiError(400, "Sex must be M or F")
  if (cp < 0 || cp > 3) throw new ApiError(400, "Chest pain type must be between 0 and 3")
  if (trestbps < 80 || trestbps > 200) throw new ApiError(400, "Blood pressure must be between 80 and 200")
  if (chol < 100 || chol > 600) throw new ApiError(400, "Cholesterol must be between 100 and 600")
  if (![0, 1].includes(fbs)) throw new ApiError(400, "Fasting blood sugar must be 0 or 1")
  if (restecg < 0 || restecg > 2) throw new ApiError(400, "Resting ECG must be between 0 and 2")
  if (thalach < 60 || thalach > 220) throw new ApiError(400, "Max heart rate must be between 60 and 220")
  if (![0, 1].includes(exang)) throw new ApiError(400, "Exercise induced angina must be 0 or 1")
  if (oldpeak < 0 || oldpeak > 10) throw new ApiError(400, "ST depression must be between 0 and 10")
  if (slope < 0 || slope > 2) throw new ApiError(400, "Slope must be between 0 and 2")
  if (ca < 0 || ca > 4) throw new ApiError(400, "Number of vessels must be between 0 and 4")
  if (thal < 0 || thal > 3) throw new ApiError(400, "Thalassemia must be between 0 and 3")
  if (![0, 1].includes(prediction)) throw new ApiError(400, "Prediction must be 0 or 1")
  if (confidence < 0 || confidence > 1) throw new ApiError(400, "Confidence must be between 0 and 1")
  if (!["Low", "Medium", "High"].includes(riskLevel)) {
    throw new ApiError(400, "Risk level must be Low, Medium, or High")
  }

  try {
    const newPrediction = await Prediction.create({
      userId: req.user._id,
      age,
      sex,
      cp,
      trestbps,
      chol,
      fbs,
      restecg,
      thalach,
      exang,
      oldpeak,
      slope,
      ca,
      thal,
      prediction,
      confidence,
      riskLevel,
      notes: notes || "",
    })

    return res.status(201).json(new ApiResponse(201, newPrediction, "Prediction saved successfully"))
  } catch (error) {
    console.error("Error creating prediction:", error)
    throw new ApiError(500, "Failed to save prediction")
  }
})

// Get user's predictions
const getUserPredictions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, riskLevel, prediction } = req.query

  const filter = { userId: req.user._id }

  if (riskLevel) {
    filter.riskLevel = riskLevel
  }

  if (prediction !== undefined) {
    filter.prediction = parseInt(prediction)
  }

  try {
    const predictions = await Prediction.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec()

    const total = await Prediction.countDocuments(filter)

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          predictions,
          totalPages: Math.ceil(total / limit),
          currentPage: page,
          total,
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
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid prediction ID")
  }

  try {
    const prediction = await Prediction.findOne({
      _id: id,
      userId: req.user._id,
    })

    if (!prediction) {
      throw new ApiError(404, "Prediction not found")
    }

    return res.status(200).json(new ApiResponse(200, prediction, "Prediction fetched successfully"))
  } catch (error) {
    console.error("Error fetching prediction:", error)
    throw new ApiError(500, "Failed to fetch prediction")
  }
})

// Delete prediction
const deletePrediction = asyncHandler(async (req, res) => {
  const { id } = req.params

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid prediction ID")
  }

  try {
    const prediction = await Prediction.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    })

    if (!prediction) {
      throw new ApiError(404, "Prediction not found")
    }

    return res.status(200).json(new ApiResponse(200, {}, "Prediction deleted successfully"))
  } catch (error) {
    console.error("Error deleting prediction:", error)
    throw new ApiError(500, "Failed to delete prediction")
  }
})

// Get prediction statistics
const getPredictionStats = asyncHandler(async (req, res) => {
  try {
    const stats = await Prediction.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(req.user._id) } },
      {
        $group: {
          _id: null,
          totalPredictions: { $sum: 1 },
          heartDiseaseCount: { $sum: { $cond: [{ $eq: ["$prediction", 1] }, 1, 0] } },
          noHeartDiseaseCount: { $sum: { $cond: [{ $eq: ["$prediction", 0] }, 1, 0] } },
          highRiskCount: { $sum: { $cond: [{ $eq: ["$riskLevel", "High"] }, 1, 0] } },
          mediumRiskCount: { $sum: { $cond: [{ $eq: ["$riskLevel", "Medium"] }, 1, 0] } },
          lowRiskCount: { $sum: { $cond: [{ $eq: ["$riskLevel", "Low"] }, 1, 0] } },
          avgConfidence: { $avg: "$confidence" },
        },
      },
    ])

    const result = stats[0] || {
      totalPredictions: 0,
      heartDiseaseCount: 0,
      noHeartDiseaseCount: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
      avgConfidence: 0,
    }

    return res.status(200).json(new ApiResponse(200, result, "Statistics fetched successfully"))
  } catch (error) {
    console.error("Error fetching statistics:", error)
    throw new ApiError(500, "Failed to fetch statistics")
  }
})

export { createPrediction, getUserPredictions, getPredictionById, deletePrediction, getPredictionStats }
