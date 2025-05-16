import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/twitter-clone";

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Import User model
import User from "../models/user.model.js";

const createTestUsers = async () => {
    try {
        console.log("\n=== Creating Test Users ===\n");

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash("123456", salt);

        // Create test user 1
        const user1 = await User.create({
            username: "testuser1",
            fullName: "Test User 1",
            email: "test1@test.com",
            password: hashedPassword
        });
        console.log("Created test user 1:", user1.username);

        // Create test user 2
        const user2 = await User.create({
            username: "testuser2",
            fullName: "Test User 2",
            email: "test2@test.com",
            password: hashedPassword
        });
        console.log("Created test user 2:", user2.username);

        console.log("\n=== Test users created successfully ===");
        console.log("Username: testuser1, Password: 123456");
        console.log("Username: testuser2, Password: 123456");

    } catch (error) {
        console.error("Failed to create test users:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
};

// Run the script
createTestUsers(); 