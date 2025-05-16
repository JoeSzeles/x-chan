const mongoose = require('mongoose');

const threadCommentSchema = new mongoose.Schema({
    board: {
        type: String,
        required: true,
        index: true
    },
    threadId: {
        type: String,
        required: true,
        index: true
    },
    text: {
        type: String,
        required: true
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
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
threadCommentSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Create compound index for efficient querying
threadCommentSchema.index({ board: 1, threadId: 1 });

const ThreadComment = mongoose.model('ThreadComment', threadCommentSchema);

module.exports = ThreadComment; 