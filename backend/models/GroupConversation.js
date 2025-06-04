
import mongoose from "mongoose";

const GroupConversationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastMessage: {
    content: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  admins: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Index for faster queries
GroupConversationSchema.index({ participants: 1 });
GroupConversationSchema.index({ createdBy: 1 });
GroupConversationSchema.index({ lastActivity: -1 });

// Update lastActivity when any change occurs
GroupConversationSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

let GroupConversation;
try {
  GroupConversation = mongoose.model("GroupConversation");
} catch (error) {
  GroupConversation = mongoose.model("GroupConversation", GroupConversationSchema);
}

export default GroupConversation;
