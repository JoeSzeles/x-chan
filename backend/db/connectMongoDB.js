import mongoose from "mongoose";

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI?.startsWith('mongodb') 
      ? process.env.MONGODB_URI 
      : `mongodb://${encodeURIComponent(process.env.MONGODB_URI)}`;
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      keepAlive: true,
      retryWrites: true,
      w: 'majority'
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectMongoDB;