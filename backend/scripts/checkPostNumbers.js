import mongoose from 'mongoose';
import Post from '../models/post.model.js';
import Comment from '../models/comment.model.js';
import dotenv from 'dotenv';

dotenv.config();

const checkPostNumbers = async () => {
    try {
        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all posts and comments
        const [posts, comments] = await Promise.all([
            Post.find({}).sort({ createdAt: 1 }),
            Comment.find({}).sort({ createdAt: 1 })
        ]);

        console.log('\nPosts:');
        posts.forEach(post => {
            console.log(`Post ${post._id}: postNumber = ${post.postNumber}`);
        });

        console.log('\nComments:');
        comments.forEach(comment => {
            console.log(`Comment ${comment._id}: postNumber = ${comment.postNumber}`);
        });

        console.log(`\nSummary:`);
        console.log(`- Total posts: ${posts.length}`);
        console.log(`- Total comments: ${comments.length}`);
        console.log(`- Posts with postNumber: ${posts.filter(p => p.postNumber).length}`);
        console.log(`- Comments with postNumber: ${comments.filter(c => c.postNumber).length}`);

    } catch (error) {
        console.error('Error during check:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
};

// Run the script
checkPostNumbers(); 