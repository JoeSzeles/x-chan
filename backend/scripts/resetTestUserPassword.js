
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

const resetUserPassword = async () => {
    try {
        console.log("\n=== Resetting Test User Password ===\n");

        const username = "therapistforrainbows";
        const newPassword = "123456"; // You can change this to whatever you want

        // Find the user
        const user = await User.findOne({ username });
        
        if (!user) {
            console.log(`User '${username}' not found`);
            return;
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update the user's password
        await User.updateOne(
            { username },
            { password: hashedPassword }
        );

        console.log(`✓ Password reset successfully for user: ${username}`);
        console.log(`New password: ${newPassword}`);

    } catch (error) {
        console.error("Failed to reset password:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
};

// Run the script
resetUserPassword();
