import { Router } from "express"
import {
  registerUser,
  verifyOTP,
  resendOTP,
  getCurrentUser,
  loginUser,
  logoutUser,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
} from "../controllers/user.controller.js"
import { verifyJWT, authorizeDoctor, authorizeAdmin } from "../middlewares/auth.middleware.js"

const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/verify-otp").post(verifyOTP)
router.route("/resend-otp").post(resendOTP)
router.route("/forgot-password").post(forgotPassword)
router.route("/reset-password/:token").post(resetPassword)
router.route("/refresh-token").post(refreshAccessToken)

router.route("/logout").post(verifyJWT, logoutUser)
router.route("/me").get(verifyJWT, getCurrentUser)

router.route("/doctor-dashboard").get(verifyJWT, authorizeDoctor, (req, res) => {
  res.json({ message: "Welcome to doctor dashboard", user: req.user })
})


router.route("/admin-dashboard").get(verifyJWT, authorizeAdmin, (req, res) => {
  res.json({ message: "Welcome to admin dashboard", user: req.user })
})

router.route("/user-dashboard").get(verifyJWT, (req, res) => {
  res.json({ message: "Welcome to user dashboard", user: req.user })
})

export default router
