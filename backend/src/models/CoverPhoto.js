const mongoose = require('mongoose');

const coverPhotoSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['image', 'video', 'content'],
        default: 'image'
    },
    content: {
        type: String,
        required: true
    },
    metadata: {
        videoId: String,
        contentId: String,
        source: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
coverPhotoSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const CoverPhoto = mongoose.model('CoverPhoto', coverPhotoSchema);

module.exports = CoverPhoto; 