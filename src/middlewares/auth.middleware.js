import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/index.js"

export const verifyJWT = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

    // Clean up token - remove any extra whitespace or invalid characters
    if (token) {
      token = token.trim()
      // Check if token looks like a valid JWT (has 3 parts separated by dots)
      const tokenParts = token.split(".")
      if (tokenParts.length !== 3) {
        console.error("Invalid token format - not a valid JWT:", token.substring(0, 20) + "...")
        throw new ApiError(401, "Invalid token format")
      }
    }

    if (!token) {
      throw new ApiError(401, "Unauthorized request - no token provided")
    }

    let decodedToken
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
    } catch (jwtError) {
      console.error("JWT verification failed:", jwtError.message)
      if (jwtError.name === "TokenExpiredError") {
        throw new ApiError(401, "Token expired")
      } else if (jwtError.name === "JsonWebTokenError") {
        throw new ApiError(401, "Invalid token")
      } else {
        throw new ApiError(401, "Token verification failed")
      }
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken")

    if (!user) {
      throw new ApiError(401, "Invalid Access Token - user not found")
    }

    req.user = user
    next()
  } catch (error) {
    console.error("Auth middleware error:", error.message)
    next(error)
  }
}

export const authorizeUser = (req, res, next) => {
  if (req.user.role !== "user" && req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. User role required.")
  }
  next()
}

export const authorizeDoctor = (req, res, next) => {
  if (req.user.role !== "doctor" && req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Doctor role required.")
  }
  next()
}

export const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== "admin") {
    throw new ApiError(403, "Access denied. Admin role required.")
  }
  next()
}
