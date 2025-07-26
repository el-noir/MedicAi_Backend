import { asyncHandler, ApiError, ApiResponse } from "../utils/index.js"
import { User } from "../models/user.model.js"
import { sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } from "../utils/emailService.js"
import crypto from "crypto"
import jwt from "jsonwebtoken"

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId)
    const refreshToken = user.generateRefreshToken()
    const accessToken = user.generateAccessToken()
    user.refreshToken = refreshToken
    await user.save({ validateBeforeSave: false })
    return { accessToken, refreshToken }
  } catch (error) {
    console.error("Error generating tokens:", error.message)
    throw new ApiError("Error generating tokens", 500)
  }
}

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, username, role, specialization, licenseNumber, experience } = req.body

  // Validate required fields
  const requiredFields = { fullName, email, password, username }
  for (const [key, value] of Object.entries(requiredFields)) {
    if (!value || value.trim() === "") {
      throw new ApiError(`${key} is required`, 400)
    }
  }

  // Validate doctor-specific fields
  if (role === "doctor") {
    if (!specialization || !licenseNumber || !experience) {
      throw new ApiError("Specialization, license number, and experience are required for doctors", 400)
    }
    if (experience < 0) {
      throw new ApiError("Experience must be a positive number", 400)
    }
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ApiError("Invalid email format", 400)
  }

  // Validate username length
  if (username.length < 3) {
    throw new ApiError("Username must be at least 3 characters long", 400)
  }

  // Validate password strength
  if (password.length < 6) {
    throw new ApiError("Password must be at least 6 characters long", 400)
  }

  // Validate role
  const validRoles = ["user", "doctor"]
  if (role && !validRoles.includes(role)) {
    throw new ApiError("Invalid role. Must be 'user' or 'doctor'", 400)
  }

  // Check if user already exists
  const existedUser = await User.findOne({ $or: [{ username }, { email }] })
  if (existedUser) {
    throw new ApiError("Email or username already exists", 409)
  }

  // Check if license number already exists for doctors
  if (role === "doctor") {
    const existingDoctor = await User.findOne({ licenseNumber })
    if (existingDoctor) {
      throw new ApiError("License number already exists", 409)
    }
  }

  try {
    const userData = {
      fullName,
      email,
      username: username.toLowerCase(),
      password,
      role: role || "user",
      isVerified: false,
    }

    // Add doctor-specific fields if role is doctor
    if (role === "doctor") {
      userData.specialization = specialization
      userData.licenseNumber = licenseNumber
      userData.experience = experience
    }

    const user = await User.create(userData)

    // Generate OTP
    const otp = user.generateOTP()
    await user.save({ validateBeforeSave: false })

    // Send OTP email
    try {
      await sendOTPEmail(user, otp)
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)
    }

    const createdUser = await User.findById(user._id).select("-password -refreshToken -otp")

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          createdUser,
          `${role === "doctor" ? "Doctor" : "User"} registered successfully. Please check your email for OTP verification.`,
        ),
      )
  } catch (error) {
    console.error("Error during user creation:", error)
    throw new ApiError("Failed to create user", 500)
  }
})

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body

  if (!email || !otp) {
    throw new ApiError("Email and OTP are required", 400)
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError("User not found", 404)
  }

  // Check if OTP is expired
  if (!user.otp.expiresAt || user.otp.expiresAt < Date.now()) {
    throw new ApiError("OTP has expired", 400)
  }

  // Verify OTP
  const hashedOTP = crypto.createHash("sha256").update(otp).digest("hex")
  if (hashedOTP !== user.otp.code) {
    throw new ApiError("Invalid OTP", 400)
  }

  // Mark user as verified and clear OTP
  user.isVerified = true
  user.otp = { code: undefined, expiresAt: undefined }
  await user.save({ validateBeforeSave: false })

  // Generate tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  // Send welcome email
  try {
    await sendWelcomeEmail(user)
  } catch (emailError) {
    console.error("Failed to send welcome email:", emailError)
  }

  const verifiedUser = await User.findById(user._id).select("-password -refreshToken -otp")

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: verifiedUser,
          accessToken,
          refreshToken,
        },
        "OTP verified successfully. User is now logged in.",
      ),
    )
})

const resendOTP = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    throw new ApiError("Email is required", 400)
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError("User not found", 404)
  }

  if (user.isVerified) {
    throw new ApiError("User is already verified", 400)
  }

  // Generate new OTP
  const otp = user.generateOTP()
  await user.save({ validateBeforeSave: false })

  // Send OTP email
  try {
    await sendOTPEmail(user, otp)
    return res.status(200).json(new ApiResponse(200, {}, "OTP sent successfully"))
  } catch (emailError) {
    console.error("Failed to send OTP email:", emailError)
    throw new ApiError("Failed to send OTP email", 500)
  }
})

const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body

  if (!username && !email) {
    throw new ApiError("Please provide username or email", 400)
  }

  const user = await User.findOne({ $or: [{ username }, { email }] })
  if (!user) {
    throw new ApiError("User not found", 401)
  }

  // Check if user is verified
  if (!user.isVerified) {
    // Generate new OTP for unverified users
    const otp = user.generateOTP()
    await user.save({ validateBeforeSave: false })

    // Send OTP email
    try {
      await sendOTPEmail(user, otp)
    } catch (emailError) {
      console.error("Failed to send OTP email:", emailError)
    }

    throw new ApiError("Account not verified. A new OTP has been sent to your email.", 401)
  }

  const isPasswordValid = await user.isPasswordCorrect(password)
  if (!isPasswordValid) {
    throw new ApiError("Invalid credentials", 401)
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken -otp")

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully",
      ),
    )
})

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    },
  )

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  }

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"))
})

const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body

  if (!email) {
    throw new ApiError("Email is required", 400)
  }

  const user = await User.findOne({ email })
  if (!user) {
    throw new ApiError("User not found", 404)
  }

  // Generate reset token
  const resetToken = user.getResetPasswordToken()
  await user.save({ validateBeforeSave: false })

  // Create reset URL
  const resetUrl = `${req.protocol}://${req.get("host")}/api/v1/users/reset-password/${resetToken}`

  try {
    await sendPasswordResetEmail(user, resetUrl)
    res.status(200).json(new ApiResponse(200, {}, "Password reset email sent successfully"))
  } catch (error) {
    user.resetPasswordToken = undefined
    user.resetPasswordExpire = undefined
    await user.save({ validateBeforeSave: false })
    throw new ApiError("Email could not be sent", 500)
  }
})

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params
  const { password } = req.body

  if (!password) {
    throw new ApiError("Password is required", 400)
  }

  if (password.length < 6) {
    throw new ApiError("Password must be at least 6 characters long", 400)
  }

  // Hash token and find user
  const resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex")

  const user = await User.findOne({
    resetPasswordToken,
    resetPasswordExpire: { $gt: Date.now() },
  })

  if (!user) {
    throw new ApiError("Password reset token is invalid or has expired", 400)
  }

  // Set new password
  user.password = password
  user.resetPasswordToken = undefined
  user.resetPasswordExpire = undefined
  await user.save()

  res.status(200).json(new ApiResponse(200, {}, "Password reset successfully"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError("Unauthorized request", 401)
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id)

    if (!user) {
      throw new ApiError("Invalid refresh token", 401)
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError("Refresh token is expired or used", 401)
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(new ApiResponse(200, { accessToken, refreshToken }, "Access token refreshed"))
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
})

export {
  registerUser,
  loginUser,
  logoutUser,
  verifyOTP,
  resendOTP,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
}
