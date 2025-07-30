import { Router } from "express"
import {
  sharePredictionWithDoctor,
  getUserSharedPredictions,
  getDoctorReceivedPredictions,
  viewSharedPrediction,
  respondToSharedPrediction,
  revokeSharedPrediction,
} from "../controllers/sharedPrediction.controller.js"
import { verifyJWT, authorizeUser, authorizeDoctor } from "../middlewares/auth.middleware.js"

const router = Router()

// All routes require authentication
router.use(verifyJWT)

// Patient routes
router.route("/share").post(authorizeUser, sharePredictionWithDoctor)
router.route("/my-shares").get(authorizeUser, getUserSharedPredictions)
router.route("/revoke/:shareId").patch(authorizeUser, revokeSharedPrediction)

// Doctor routes
router.route("/received").get(authorizeDoctor, getDoctorReceivedPredictions)
router.route("/view/:shareCode").get(authorizeDoctor, viewSharedPrediction)
router.route("/respond/:shareCode").post(authorizeDoctor, respondToSharedPrediction)

export default router