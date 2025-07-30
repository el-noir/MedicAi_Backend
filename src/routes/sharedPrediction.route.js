import { Router } from "express"
import {
  sharePrediction,
  getUserSharedPredictions,
  getDoctorReceivedPredictions,
  viewSharedPrediction,
  respondToSharedPrediction,
  revokeSharedPrediction,
} from "../controllers/sharedPrediction.controller.js"
import { verifyJWT, verifyRole } from "../middlewares/auth.middleware.js"

const router = Router()

// Share prediction with doctor (users only)
router.post("/share", verifyJWT, verifyRole(["user"]), sharePrediction)

// Get user's shared predictions (users only)
router.get("/my-shares", verifyJWT, verifyRole(["user"]), getUserSharedPredictions)

// Get doctor's received predictions (doctors only)
router.get("/received", verifyJWT, verifyRole(["doctor"]), getDoctorReceivedPredictions)

// View shared prediction by share code (doctors only)
router.get("/view/:shareCode", verifyJWT, verifyRole(["doctor"]), viewSharedPrediction)

// Respond to shared prediction (doctors only)
router.post("/respond/:shareCode", verifyJWT, verifyRole(["doctor"]), respondToSharedPrediction)

// Revoke shared prediction access (users only)
router.patch("/revoke/:shareId", verifyJWT, verifyRole(["user"]), revokeSharedPrediction)

export default router
