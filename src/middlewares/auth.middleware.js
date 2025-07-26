import { asyncHandler, ApiError } from "../utils/index.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"

export const verifyJWT = asyncHandler(async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "").trim()

    if (!token) {
      throw new ApiError("Unauthorized request", 401)
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    const user = await User.findById(decodedToken?._id).select("-password -refreshToken -otp")

    if (!user) {
      throw new ApiError("Invalid Access Token", 401)
    }

    req.user = user
    next()
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid Access Token")
  }
})

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new ApiError("Unauthorized request", 401)
    }

    if (!roles.includes(req.user.role)) {
      throw new ApiError(`Role: ${req.user.role} is not allowed to access this resource`, 403)
    }

    next()
  }
}

export const authorizeDoctor = asyncHandler(async (req, res, next) => {
  if (!["admin", "doctor"].includes(req.user.role)) {
    throw new ApiError("Access denied. Doctor or admin role required.", 403)
  }
  next()
})

export const authorizeAdmin = asyncHandler(async (req, res, next) => {
  if (req.user.role !== "admin") {
    throw new ApiError("Access denied. Admin role required.", 403)
  }
  next()
})

export const authorizeUser = asyncHandler(async (req, res, next) => {
  if (!["admin", "doctor", "user"].includes(req.user.role)) {
    throw new ApiError("Access denied. Valid user role required.", 403)
  }
  next()
})
