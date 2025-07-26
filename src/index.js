import express from 'express'
import dotenv from 'dotenv'
import connectDB from './connection/index.js'
dotenv.config(
    {path: './.env'}
)

const app = express()
import configureApp from './app.js'

configureApp(app);

connectDB()
  .then(() => {
    const PORT = process.env.PORT
    const server = app.listen(PORT, () => {
      console.log(`Server is listening on http://localhost:${PORT}`)
    })

    server.on("error", (error) => {
      console.log("Server Error: ", error)
    })
  })
  .catch((err) => {
    console.log("MongoDB connection Failed: ", err)
  })

