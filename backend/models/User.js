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
        default: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
    },
    coverPhoto: {
        type: String,
        default: ''
    },
    coverVideoUrl: {
        type: String,
        default: ''
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
    allowMessages: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Add pre-save middleware to update coverImg when coverVideoUrl changes
userSchema.pre('save', function(next) {
    if (this.isModified('coverVideoUrl') && this.coverVideoUrl) {
        const videoId = this.coverVideoUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
        if (videoId) {
            this.coverImg = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
    }
    next();
});

const User = mongoose.model('User', userSchema);

module.exports = User; 