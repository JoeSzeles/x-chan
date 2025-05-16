const mongoose = require('mongoose');

const boardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    image: {
        type: String
    },
    coverPhoto: {
        type: String
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    admins: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    bannedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    privacy: {
        type: String,
        enum: ['public', 'followers', 'lists'],
        default: 'public'
    },
    allowedLists: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'List'
    }],
    views: {
        type: Number,
        default: 0,
        min: 0
    }
}, { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Add a pre-save middleware to ensure views is never negative
boardSchema.pre('save', function(next) {
    if (this.views < 0) {
        this.views = 0;
    }
    next();
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board; 