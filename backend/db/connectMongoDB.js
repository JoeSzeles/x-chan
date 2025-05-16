import mongoose from "mongoose";

const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI?.startsWith('mongodb') 
      ? process.env.MONGODB_URI 
      : `mongodb://${encodeURIComponent(process.env.MONGODB_URI)}`;
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 75000,
      connectTimeoutMS: 50000,
      keepAlive: true,
      retryWrites: true,
      w: 'majority',
      retryReads: true,
      maxPoolSize: 10
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    process.exit(1);
  }
};

export default connectMongoDB;