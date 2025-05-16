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

const migrateToNestedPosts = async () => {
    try {
        // Find all posts
        const posts = await Post.find({});
        console.log(`Found ${posts.length} posts to migrate`);

        let migratedCount = 0;
        let errorCount = 0;
        let skippedCount = 0;

        for (const post of posts) {
            try {
                // Validate required fields
                if (!post.user) {
                    console.log(`Skipping post ${post._id} - missing user field`);
                    skippedCount++;
                    continue;
                }

                // Verify user exists
                const userExists = await User.exists({ _id: post.user });
                if (!userExists) {
                    console.log(`Skipping post ${post._id} - user ${post.user} does not exist`);
                    skippedCount++;
                    continue;
                }

                // Create a new post with the nested structure
                const newPost = new Post({
                    user: post.user,
                    text: post.text,
                    img: post.img,
                    likes: post.likes || [],
                    reposts: post.reposts || [],
                    repostedBy: post.repostedBy,
                    originalPost: post.originalPost,
                    bookmarkedBy: post.bookmarkedBy || [],
                    ratings: post.ratings || [],
                    viewCount: post.viewCount || 0,
                    createdAt: post.createdAt,
                    updatedAt: post.updatedAt,
                    // Convert comments to nested structure
                    comments: (post.comments || []).map(comment => ({
                        user: comment.user,
                        text: comment.text,
                        likes: [],
                        reposts: [],
                        bookmarkedBy: [],
                        ratings: [],
                        viewCount: 0,
                        createdAt: comment.createdAt || new Date(),
                        updatedAt: comment.updatedAt || new Date()
                    }))
                });

                // Save the new post
                await newPost.save();
                
                // Delete the old post
                await Post.findByIdAndDelete(post._id);
                
                migratedCount++;
                console.log(`Migrated post ${post._id}`);
            } catch (error) {
                console.error(`Error migrating post ${post._id}:`, error.message);
                errorCount++;
            }
        }

        console.log(`\nMigration complete:`);
        console.log(`- Successfully migrated ${migratedCount} posts`);
        console.log(`- Failed to migrate ${errorCount} posts`);
        console.log(`- Skipped ${skippedCount} posts (invalid data)`);

    } catch (error) {
        console.error("Error during migration:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB");
    }
};

// Run the migration
connectDB().then(() => {
    migrateToNestedPosts();
}); 