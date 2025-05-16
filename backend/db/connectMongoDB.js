import mongoose from "mongoose";

const connectMongoDB = async () => {
	try {
		mongoose.set('strictQuery', false);
		const conn = await mongoose.connect(process.env.MONGODB_URI);
		console.log(`MongoDB connected: ${conn.connection.host}`);
	} catch (error) {
		console.error(`Error connection to mongoDB: ${error.message}`);
		process.exit(1);
	}
};

export default connectMongoDB;
