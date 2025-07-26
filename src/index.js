import express from 'express'
import dotenv from 'dotenv'

dotenv.config(
    {path: './.env'}
)

const app = express()
import configureApp from './app.js'

configureApp(app);

const PORT = process.env.PORT || 3000

app.listen(PORT, ()=>{
  console.log(`Server is listening on http://localhost:${PORT}`);  
})
