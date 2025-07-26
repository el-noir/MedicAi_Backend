import { Router } from "express"
import {
  registerUser,
  verifyOTP,
  resendOTP,
  getCurrentUser,
} from "../controllers/user.controller.js"
import { verifyJWT, authorizeRoles } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/verify-otp").post(verifyOTP)
router.route("/resend-otp").post(resendOTP)
router.route("/me").get(verifyJWT, getCurrentUser)

export default router
