import mongoose from "mongoose";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

const MONGO_URI = "mongodb://localhost:27017/twitter-clone"; // Replace with your actual MongoDB URI

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};

const fixPosts = async () => {
    try {
        // Find all posts
        const posts = await Post.find({});
        console.log(`Found ${posts.length} posts`);

        let fixedCount = 0;
        let deletedCount = 0;

        for (const post of posts) {
            // Check if post.user exists and is a valid ObjectId
            if (!post.user || !mongoose.Types.ObjectId.isValid(post.user)) {
                console.log(`Post ${post._id} has invalid user reference`);
                
                // Try to find the original user from the post's metadata
                const originalUser = await User.findOne({ _id: post.user });
                
                if (originalUser) {
                    // If we found the user, update the post
                    post.user = originalUser._id;
                    await post.save();
                    fixedCount++;
                    console.log(`Fixed post ${post._id}`);
                } else {
                    // If we can't find the user, delete the post
                    await Post.findByIdAndDelete(post._id);
                    deletedCount++;
                    console.log(`Deleted post ${post._id} (no valid user found)`);
                }
            }
        }

        console.log(`\nFix complete:`);
        console.log(`- Fixed ${fixedCount} posts`);
        console.log(`- Deleted ${deletedCount} posts`);
        console.log(`- ${posts.length - fixedCount - deletedCount} posts were already valid`);

    } catch (error) {
        console.error("Error fixing posts:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Run the script
connectDB().then(() => {
    fixPosts();
}); 