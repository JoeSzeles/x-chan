import mongoose from "mongoose";

const connectMongoDB = async () => {
	try {
		if (!process.env.MONGODB_URI) {
			throw new Error('MONGODB_URI environment variable is not defined');
		}

		if (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://')) {
			throw new Error('Invalid MongoDB URI format. URI must start with "mongodb://" or "mongodb+srv://"');
		}

		mongoose.set('strictQuery', false);
		const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/twitter-clone";
		const conn = await mongoose.connect(mongoUri, {
			useNewUrlParser: true,
			useUnifiedTopology: true,
			serverSelectionTimeoutMS: 5000
		});
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error connecting to MongoDB: ${error.message}`);
		process.exit(1);
	}
};

export default connectMongoDB;