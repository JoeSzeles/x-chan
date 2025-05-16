import mongoose from "mongoose";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/twitter-clone";

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Import models
import Post from "../models/post.model.js";
import User from "../models/user.model.js";

const testNestedComments = async () => {
    try {
        console.log("\n=== Starting Nested Comments Test ===\n");

        // Create test users
        const user1 = await User.create({
            username: `testuser1_${uuidv4().slice(0, 8)}`,
            fullName: "Test User 1",
            email: `test1_${uuidv4().slice(0, 8)}@test.com`,
            password: "password123"
        });

        const user2 = await User.create({
            username: `testuser2_${uuidv4().slice(0, 8)}`,
            fullName: "Test User 2",
            email: `test2_${uuidv4().slice(0, 8)}@test.com`,
            password: "password123"
        });

        console.log("Created test users:", {
            user1: user1.username,
            user2: user2.username
        });

        // Create a test post
        const post = await Post.create({
            user: user1._id,
            text: "Test post for nested comments",
            likes: [],
            reposts: [],
            bookmarkedBy: [],
            viewCount: 0
        });

        console.log("\nCreated test post:", post._id);

        // Test 1: Add a top-level comment
        const comment1 = {
            user: user2._id,
            text: "First level comment",
            likes: [],
            reposts: [],
            bookmarkedBy: [],
            viewCount: 0
        };

        post.comments.push(comment1);
        await post.save();

        console.log("\nTest 1: Added top-level comment");
        console.log("Post comments count:", post.comments.length);

        // Test 2: Add a reply to the first comment
        const comment2 = {
            user: user1._id,
            text: "Reply to first comment",
            likes: [],
            reposts: [],
            bookmarkedBy: [],
            viewCount: 0
        };

        post.comments.push(comment2);
        await post.save();

        console.log("\nTest 2: Added reply comment");
        console.log("Post comments count:", post.comments.length);

        // Test 3: Like a comment
        const commentToLike = post.comments[0];
        commentToLike.likes.push(user1._id);
        await post.save();

        console.log("\nTest 3: Liked first comment");
        console.log("Comment likes count:", commentToLike.likes.length);

        // Test 4: Repost a comment
        const commentToRepost = post.comments[0];
        commentToRepost.reposts.push(user2._id);
        await post.save();

        console.log("\nTest 4: Reposted first comment");
        console.log("Comment reposts count:", commentToRepost.reposts.length);

        // Test 5: Bookmark a comment
        const commentToBookmark = post.comments[0];
        commentToBookmark.bookmarkedBy.push(user1._id);
        await post.save();

        console.log("\nTest 5: Bookmarked first comment");
        console.log("Comment bookmarks count:", commentToBookmark.bookmarkedBy.length);

        // Test 6: Verify the structure
        const populatedPost = await Post.findById(post._id)
            .populate('comments.user', 'username fullName')
            .populate('comments.likes', 'username')
            .populate('comments.reposts', 'username')
            .populate('comments.bookmarkedBy', 'username');

        console.log("\nTest 6: Verifying final structure");
        console.log("Post structure:", JSON.stringify(populatedPost, null, 2));

        // Cleanup
        await Post.deleteOne({ _id: post._id });
        await User.deleteOne({ _id: user1._id });
        await User.deleteOne({ _id: user2._id });

        console.log("\n=== Test completed successfully ===");
        console.log("Cleaned up test data");

    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await mongoose.disconnect();
        console.log("\nDisconnected from MongoDB");
    }
};

// Run the test
testNestedComments(); 