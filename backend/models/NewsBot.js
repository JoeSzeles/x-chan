import mongoose from "mongoose";

const newsBotSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    websites: [{
        url: {
            type: String,
            required: true
        },
        type: {
            type: String,
            enum: ['news', 'blog', 'social', 'video'],
            default: 'news'
        },
        selector: {
            type: String,
            required: true
        },
        searchTerms: {
            type: String,
            default: ''
        },
        active: {
            type: Boolean,
            default: true
        }
    }],
    updateInterval: {
        type: Number,
        default: 3600, // 1 hour in seconds
        min: 1,
        max: 60
    },
    lastUpdate: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['active', 'paused', 'error'],
        default: 'active'
    },
    settings: {
        maxArticlesPerUpdate: {
            type: Number,
            default: 50
        },
        filterKeywords: [String],
        excludeKeywords: [String],
        language: {
            type: String,
            default: 'en'
        },
        autoPost: {
            type: Boolean,
            default: false
        }
    },
    stats: {
        totalArticles: {
            type: Number,
            default: 0
        },
        lastError: String,
        errorCount: {
            type: Number,
            default: 0
        },
        newArticles: {
            type: Number,
            default: 0
        },
        postedArticles: {
            type: Number,
            default: 0
        }
    }
}, {
    timestamps: true
});

// Index for faster queries
newsBotSchema.index({ owner: 1, status: 1 });
newsBotSchema.index({ lastUpdate: 1 });

const NewsBot = mongoose.model("NewsBot", newsBotSchema);

export default NewsBot; 