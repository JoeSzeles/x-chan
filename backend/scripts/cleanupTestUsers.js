import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/twitter-clone";

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Import User model
import User from "../models/user.model.js";

const cleanupTestUsers = async () => {
    try {
        console.log("\n=== Starting Test Users Cleanup ===\n");

        // Find all test users
        const testUsers = await User.find({
            $or: [
                { username: { $regex: /^testuser1/, $options: 'i' } },
                { username: { $regex: /^testuser2/, $options: 'i' } }
            ]
        });

        console.log(`Found ${testUsers.length} test users to delete`);

        // Delete each test user
        for (const user of testUsers) {
            console.log(`Deleting user: ${user.username}`);
            await User.deleteOne({ _id: user._id });
        }

        console.log("\n=== Cleanup completed successfully ===");

    } catch (error) {
        console.error("Cleanup failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
};

// Run the cleanup
cleanupTestUsers(); 