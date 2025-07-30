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

// Prediction routes
router.route("/").post(authorizeUser, createPrediction).get(authorizeUser, getUserPredictions)

router.route("/stats").get(authorizeUser, getPredictionStats)

router.route("/:id").get(authorizeUser, getPredictionById).delete(authorizeUser, deletePrediction)

export default router
