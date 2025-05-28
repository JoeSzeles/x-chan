const mongoose = require('mongoose');

const MessageRequestSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  createdAt: { type: Date, default: Date.now }
});

// Ensure a user can only have one pending request to another user
MessageRequestSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });

module.exports = mongoose.model('MessageRequest', MessageRequestSchema); 
const mongoose = require('mongoose');

const messageRequestSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Prevent duplicate requests
messageRequestSchema.index({ senderId: 1, recipientId: 1 }, { unique: true });

const MessageRequest = mongoose.model('MessageRequest', messageRequestSchema);

module.exports = MessageRequest;
