// Async handler to avoid try-catch blocks
export const asyncHandler = (requestHandler) => {
  return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
  }
}

// Custom API Error class
export class ApiError extends Error {
  constructor(message = "Something went wrong", statusCode = 500, errors = [], stack = "") {
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

// Custom API Response class
export class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode
    this.data = data
    this.message = message
    this.success = statusCode < 400
  }
}

// Error middleware
export const errorMiddleware = (err, req, res, next) => {
  console.error("ERROR: ", err)

  const statusCode = err.statusCode || 500
  const message = err.message || "Something went wrong"
  const errors = err.errors || []

  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  })
}
