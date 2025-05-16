import mongoose from 'mongoose';
import Post from '../models/post.model.js';
import Comment from '../models/comment.model.js';
import dotenv from 'dotenv';

dotenv.config();

const assignPostNumbers = async () => {
    try {
        // Connect to MongoDB
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in .env file');
        }
        
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get all posts and comments sorted by creation date
        const [posts, comments] = await Promise.all([
            Post.find({}).sort({ createdAt: 1 }),
            Comment.find({}).sort({ createdAt: 1 })
        ]);

        console.log(`Found ${posts.length} posts and ${comments.length} comments to update`);

        // Combine and sort all items by creation date
        const allItems = [
            ...posts.map(p => ({ type: 'post', item: p })),
            ...comments.map(c => ({ type: 'comment', item: c }))
        ].sort((a, b) => a.item.createdAt - b.item.createdAt);

        // Assign post numbers
        let currentNumber = 1;
        for (const { type, item } of allItems) {
            if (!item.postNumber) {
                if (type === 'post') {
                    await Post.updateOne(
                        { _id: item._id },
                        { $set: { postNumber: currentNumber } }
                    );
                    console.log(`Assigned post number ${currentNumber} to post ${item._id}`);
                } else {
                    await Comment.updateOne(
                        { _id: item._id },
                        { $set: { postNumber: currentNumber } }
                    );
                    console.log(`Assigned post number ${currentNumber} to comment ${item._id}`);
                }
                currentNumber++;
            }
        }

        console.log(`\nMigration complete:`);
        console.log(`- Processed ${allItems.length} items`);
        console.log(`- Assigned ${currentNumber - 1} post numbers`);

    } catch (error) {
        console.error('Error during migration:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
};

// Run the script
assignPostNumbers(); 