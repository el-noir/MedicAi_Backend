import { Router } from "express"
import {
  createPrediction,
  getUserPredictions,
  getPredictionById,
  deletePrediction,
  getPredictionStats,
} from "../controllers/prediction.controller.js"
import { verifyJWT, authorizeUser } from "../middlewares/auth.middleware.js"

const router = Router()

// All routes require authentication
router.use(verifyJWT)
router.use(authorizeUser)

// Prediction routes
router.route("/").post(createPrediction).get(getUserPredictions)
router.route("/stats").get(getPredictionStats)
router.route("/:predictionId").get(getPredictionById).delete(deletePrediction)

export default router
