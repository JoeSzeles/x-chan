import mongoose from 'mongoose';

const listSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    privacy: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    items: [{
        type: {
            type: String,
            enum: ['post', 'thread', 'user'],
            required: true
        },
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        }
    }],
    followers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }]
}, {
    timestamps: true
});

// Indexes for better query performance
listSchema.index({ owner: 1 });
listSchema.index({ privacy: 1 });
listSchema.index({ 'items.itemId': 1 });

const List = mongoose.model('List', listSchema);

export default List; 