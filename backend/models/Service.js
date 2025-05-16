import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    category: {
        type: String,
        required: true,
        enum: ['job-offers', 'job-seekers', 'business', 'other']
    },
    title: {
        type: String,
        required: true,
        trim: true
    },
    content: {
        type: String,
        required: true
    },
    images: [{
        type: String
    }],
    price: {
        type: Number,
        default: null
    },
    location: {
        type: String,
        default: null
    },
    contactInfo: {
        email: String,
        phone: String,
        website: String
    },
    tags: [{
        type: String,
        trim: true
    }],
    views: {
        type: Number,
        default: 0
    },
    likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        content: String,
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for better search performance
ServiceSchema.index({ category: 1, title: 'text', content: 'text', tags: 'text' });

export default mongoose.model('Service', ServiceSchema); 