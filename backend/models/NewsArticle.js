import mongoose from "mongoose";

const newsArticleSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: true,
        unique: true
    },
    imageUrl: String,
    source: {
        name: String,
        url: String
    },
    author: String,
    publishedAt: {
        type: Date,
        required: true
    },
    bot: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NewsBot",
        required: true
    },
    website: {
        url: String,
        type: String
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    engagement: {
        views: {
            type: Number,
            default: 0
        },
        likes: {
            type: Number,
            default: 0
        },
        shares: {
            type: Number,
            default: 0
        },
        comments: {
            type: Number,
            default: 0
        }
    },
    status: {
        type: String,
        enum: ['active', 'archived', 'deleted'],
        default: 'active'
    }
}, {
    timestamps: true
});

// Indexes for faster queries
newsArticleSchema.index({ bot: 1, publishedAt: -1 });
newsArticleSchema.index({ url: 1 }, { unique: true });
newsArticleSchema.index({ status: 1 });

const NewsArticle = mongoose.model("NewsArticle", newsArticleSchema);

export default NewsArticle; 