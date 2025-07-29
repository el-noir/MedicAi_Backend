export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
  }
}

export class ApiError extends Error {
  constructor(statusCode = 500, message = "Something went wrong", errors = [], stack = "") {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
    this.success = false
    this.data = null

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}

export const errorMiddleware = (err, req, res, next) => {
  console.error("ERROR: ", err)

  let error = { ...err }
  error.message = err.message

  if (err.name === "CastError") {
    const message = "Resource not found"
    error = new ApiError(message, 404)
  }

  if (err.code === 11000) {
    const message = "Duplicate field value entered"
    error = new ApiError(message, 400)
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message)
    error = new ApiError(message, 400)
  }

  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token"
    error = new ApiError(message, 401)
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired"
    error = new ApiError(message, 401)
  }

  const statusCode = error.statusCode || 500
  const message = error.message || "Something went wrong"
  const errors = error.errors || []

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  })
}
