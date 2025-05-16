const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    profileImg: {
        type: String,
        default: ""
    },
    coverImg: {
        type: String,
        default: ""
    },
    coverPhoto: {
        type: {
            type: String,
            enum: ['image', 'video'],
            default: 'video'
        },
        content: {
            type: String,
            default: 'dQw4w9WgXcQ'
        },
        metadata: {
            videoId: {
                type: String,
                default: 'dQw4w9WgXcQ'
            },
            source: {
                type: String,
                default: 'youtube'
            }
        }
    },
    bio: {
        type: String,
        default: ""
    },
    location: {
        type: String,
        default: ""
    },
    website: {
        type: String,
        default: ""
    },
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    following: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    posts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    bookmarks: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User; 