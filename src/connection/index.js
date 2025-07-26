import mongoose from "mongoose";

const connectDB = async () => {
  try {
    console.log(`Connecting to: ${process.env.MONGODB_URI}`);
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI.trim()}`, {
 
    });
    console.log(`\nMongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("MongoDB connection failed: ", error);
    process.exit(1); 
  }
};

export default connectDB;
