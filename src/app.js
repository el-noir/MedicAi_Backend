import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import { errorMiddleware } from "./utils/index.js"

const app = express()

// CORS configuration - MUST be before other middleware
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)

    const allowedOrigins = [
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://medic-ai-el.vercel.app",
      "https://68858ee7702b50e1034220f1--medicai-beta.netlify.app",
      process.env.CORS_ORIGIN,
    ].filter(Boolean)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error("Not allowed by CORS"))
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Origin",
    "X-Requested-With",
    "Content-Type",
    "Accept",
    "Authorization",
    "Cache-Control",
    "X-Access-Token",
  ],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
}

app.use(cors(corsOptions))

// app.options("*", cors(corsOptions))

// Body parsing middleware
app.use(express.json({ limit: "16kb" }))
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(cookieParser())

import userRoutes from "./routes/user.route.js"
import predictionRoutes from "./routes/prediction.routes.js"

app.use("/api/v1/users", userRoutes)
app.use("/api/v1/predictions", predictionRoutes)
// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running successfully",
    timestamp: new Date().toISOString(),
  })
})

// Error handling middleware (should be last)
app.use(errorMiddleware)

export default app
