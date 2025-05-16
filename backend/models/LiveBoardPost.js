import mongoose from 'mongoose';

const LiveBoardPostSchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['text', 'link', 'youtube', 'image'],
        required: true
    },
    url: {
        type: String,
        required: function() {
            return ['link', 'youtube', 'image'].includes(this.type);
        }
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    blockedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
});

const LiveBoardPost = mongoose.model('LiveBoardPost', LiveBoardPostSchema);
export default LiveBoardPost; 