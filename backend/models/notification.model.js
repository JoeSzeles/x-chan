
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['like', 'comment', 'repost', 'follow', 'mention', 'post_reply', 'news_update', 'service_update', 'thread_activity', 'comment_reply', 'milestone', 'trending_topic', 'board_activity', 'system_announcement', 'bookmark', 'newsbot_activity'],
    required: true
  },
  content: {
    type: String,
    default: ''
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  newsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'News'
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Thread'
  },
  referencedPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  read: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;
