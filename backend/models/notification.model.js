import mongoose from "mongoose";

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
			enum: [
				"follow",
				"like",
				"repost",
				"reply",
				"news_update",
				"service_update",
				"thread_activity",
				"post_reply"
			],
		},
		content: {
			type: String,
			required: true,
		},
		postId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
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
		read: {
			type: Boolean,
			default: false,
		},
	},
	{ timestamps: true }
);

// Add indexes for better query performance
notificationSchema.index({ to: 1, createdAt: -1 });
notificationSchema.index({ to: 1, read: 1 });
notificationSchema.index({ type: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
