import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Thread from "../models/thread.model.js";
import Post from "../models/post.model.js";
import { io } from "../server.js";

// Helper function to create notifications
const createNotification = async (data) => {
	try {
		const notification = new Notification({
			from: data.from,
			to: data.to,
			type: data.type,
			content: data.content,
			postId: data.postId,
			newsId: data.newsId,
			serviceId: data.serviceId,
			threadId: data.threadId,
		});

		await notification.save();

		// Emit notification to the recipient's room
		io.to(`notifications_${data.to}`).emit('newNotification', notification);

		return notification;
	} catch (error) {
		console.log("Error in createNotification:", error.message);
		throw error;
	}
};

// Create news update notification
export const createNewsNotification = async (newsId, content) => {
	try {
		const users = await User.find({ "settings.notifications.news": true });
		const notifications = users.map(user => ({
			from: process.env.SYSTEM_USER_ID, // System user ID for automated notifications
			to: user._id,
			type: "news_update",
			content,
			newsId
		}));

		await Notification.insertMany(notifications);
	} catch (error) {
		console.log("Error in createNewsNotification:", error.message);
		throw error;
	}
};

// Create service update notification
export const createServiceNotification = async (serviceId, content) => {
	try {
		const users = await User.find({ "settings.notifications.services": true });
		const notifications = users.map(user => ({
			from: process.env.SYSTEM_USER_ID,
			to: user._id,
			type: "service_update",
			content,
			serviceId
		}));

		await Notification.insertMany(notifications);
	} catch (error) {
		console.log("Error in createServiceNotification:", error.message);
		throw error;
	}
};

// Create thread activity notification
export const createThreadNotification = async (threadId, userId, content) => {
	try {
		const thread = await Thread.findById(threadId).populate("followers");
		const notifications = thread.followers
			.filter(follower => follower._id.toString() !== userId.toString())
			.map(follower => ({
				from: userId,
				to: follower._id,
				type: "thread_activity",
				content,
				threadId
			}));

		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
		}
	} catch (error) {
		console.log("Error in createThreadNotification:", error.message);
		throw error;
	}
};

// Create post reply notification
export const createPostReplyNotification = async (postId, userId, content) => {
	try {
		const post = await Post.findById(postId).populate("user");
		if (post.user._id.toString() !== userId.toString()) {
			await createNotification({
				from: userId,
				to: post.user._id,
				type: "post_reply",
				content,
				postId
			});
		}
	} catch (error) {
		console.log("Error in createPostReplyNotification:", error.message);
		throw error;
	}
};

export const getNotifications = async (req, res) => {
	try {
		const userId = req.user._id;
		const { page = 1, limit = 20 } = req.query;

		const notifications = await Notification.find({ to: userId })
			.populate({
				path: "from",
				select: "username profileImg",
			})
			.populate({
				path: "postId",
				select: "text user",
				populate: {
					path: "user",
					select: "username profileImg"
				}
			})
			.populate({
				path: "newsId",
				select: "title content",
			})
			.populate({
				path: "serviceId",
				select: "name description",
			})
			.populate({
				path: "threadId",
				select: "title description",
			})
			.sort({ createdAt: -1 })
			.skip((page - 1) * limit)
			.limit(parseInt(limit));

		const total = await Notification.countDocuments({ to: userId });

		// Mark notifications as read
		await Notification.updateMany(
			{ to: userId, read: false },
			{ read: true }
		);

		console.log('Sending notifications:', notifications.length);

		res.status(200).json({
			notifications,
			total,
			pages: Math.ceil(total / limit),
			currentPage: parseInt(page)
		});
	} catch (error) {
		console.log("Error in getNotifications function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const deleteNotifications = async (req, res) => {
	try {
		const userId = req.user._id;
		await Notification.deleteMany({ to: userId });
		res.status(200).json({ message: "Notifications deleted successfully" });
	} catch (error) {
		console.log("Error in deleteNotifications function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const markNotificationAsRead = async (req, res) => {
	try {
		const { notificationId } = req.params;
		const userId = req.user._id;

		const notification = await Notification.findOneAndUpdate(
			{ _id: notificationId, to: userId },
			{ read: true },
			{ new: true }
		);

		if (!notification) {
			return res.status(404).json({ error: "Notification not found" });
		}

		res.status(200).json(notification);
	} catch (error) {
		console.log("Error in markNotificationAsRead function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
