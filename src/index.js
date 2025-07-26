import dotenv from "dotenv"
import connectDB from "./connection/index.js"
import app from "./app.js"

dotenv.config({
  path: "./.env",
})

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3000

    const server = app.listen(PORT, () => {
      console.log(`Server is listening on http://localhost:${PORT}`)
      console.log(`Health check: http://localhost:${PORT}/health`)
    })

    server.on("error", (error) => {
      console.log("Server Error: ", error)
    })
  })
  .catch((err) => {
    console.log("MongoDB connection Failed: ", err)
  })
