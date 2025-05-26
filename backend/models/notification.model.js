import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
	{
		from: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		to: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		type: {
			type: String,
			required: true,
			enum: ["follow", "like", "comment", "repost", "bookmark", "news_update", "service_update", "thread_activity", "post_reply", "comment_reply", "mention", "milestone", "trending_topic", "board_activity", "system_announcement", "newsbot_activity"],
		},
		content: {
			type: String,
			default: "",
		},
		read: {
			type: Boolean,
			default: false,
		},
		// Legacy field for backward compatibility
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
		// Legacy field for backward compatibility
		postId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
		// Primary field for post references
		referencedPost: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
		},
		commentId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
		},
		newsId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "News",
		},
		serviceId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Service",
		},
		threadId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Thread",
		},
		topicId: {
			type: mongoose.Schema.Types.ObjectId,
		},
		boardId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Board",
		},
		linkUrl: {
			type: String,
		},
	},
	{ timestamps: true }
);

// Add indexes for better performance
notificationSchema.index({ to: 1, createdAt: -1 });
notificationSchema.index({ type: 1 });
notificationSchema.index({ read: 1 });

// Pre-save middleware to ensure post references are properly set
notificationSchema.pre('save', function(next) {
	// If we have a post or postId but no referencedPost, set referencedPost
	if ((this.post || this.postId) && !this.referencedPost) {
		this.referencedPost = this.post || this.postId;
	}

	// For certain types, ensure we have a post reference
	if (['like', 'repost', 'bookmark', 'comment', 'post_reply'].includes(this.type)) {
		if (!this.referencedPost && !this.post && !this.postId) {
			console.warn(`Notification of type ${this.type} created without post reference`);
		}
	}

	next();
});

const Notification = mongoose.model('Notification', notificationSchema);
export default Notification;