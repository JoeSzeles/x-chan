import mongoose from 'mongoose';

const postSchema = new mongoose.Schema({
    text: {
        type: String,
        required: true
    },
    img: {
        type: String
    },
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isAnonymous: {
        type: Boolean,
        default: false
    },
    anonymousId: {
        type: String
    },
    parentPost: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    metadata: {
        source: {
            type: {
                type: String,
                enum: ['4chan', 'original']
            },
            board: String,
            threadId: String,
            postId: String,
            originalUrl: String
        },
        stats: {
            replies: Number,
            images: Number
        }
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    reposts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isRepost: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Add indexes for better query performance
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ parentPost: 1, createdAt: 1 });
postSchema.index({ 'metadata.source.type': 1, 'metadata.source.threadId': 1 });

const Post = mongoose.model('Post', postSchema);

export default Post; 