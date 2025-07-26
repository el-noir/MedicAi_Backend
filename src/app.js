import express from 'express'
import cors from 'cors'
const app = express()

export default function configureApp(app){
app.use(cors(
    {
        origin: process.env.CORS_ORIGIN
    }
))

return app
}






export {app}
