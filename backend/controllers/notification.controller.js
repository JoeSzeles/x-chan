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

// Create comment reply notification
export const createCommentReplyNotification = async (commentId, postId, userId, content) => {
	try {
		const comment = await Comment.findById(commentId);
		if (comment && comment.user.toString() !== userId.toString()) {
			await createNotification({
				from: userId,
				to: comment.user,
				type: "comment_reply",
				content,
				postId,
				commentId
			});
		}
	} catch (error) {
		console.log("Error in createCommentReplyNotification:", error.message);
		throw error;
	}
};

// Create mention notification
export const createMentionNotification = async (postId, mentionedUserIds, userId, content) => {
	try {
		// Filter out the current user from mentions
		const filteredMentions = mentionedUserIds.filter(id => id.toString() !== userId.toString());

		// Create notifications for each mentioned user
		for (const mentionedUserId of filteredMentions) {
			await createNotification({
				from: userId,
				to: mentionedUserId,
				type: "mention",
				content,
				postId
			});
		}
	} catch (error) {
		console.log("Error in createMentionNotification:", error.message);
		throw error;
	}
};

// Create milestone notification
export const createMilestoneNotification = async (userId, milestoneType, count) => {
	try {
		let content = "";
		switch (milestoneType) {
			case "followers":
				content = `You've reached ${count} followers!`;
				break;
			case "posts":
				content = `You've created ${count} posts!`;
				break;
			case "likes":
				content = `Your posts have received ${count} likes!`;
				break;
			default:
				content = `You've reached a new milestone: ${count} ${milestoneType}!`;
		}

		await createNotification({
			from: process.env.SYSTEM_USER_ID,
			to: userId,
			type: "milestone",
			content
		});
	} catch (error) {
		console.log("Error in createMilestoneNotification:", error.message);
		throw error;
	}
};

// Create trending topic notification
export const createTrendingTopicNotification = async (topicName, topicId) => {
	try {
		// Find users who might be interested in this topic
		// This could be based on user interests, past activity, etc.
		const interestedUsers = await User.find({
			"settings.notifications.trendingTopics": true
		});

		const notifications = interestedUsers.map(user => ({
			from: process.env.SYSTEM_USER_ID,
			to: user._id,
			type: "trending_topic",
			content: topicName,
			topicId
		}));

		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
		}
	} catch (error) {
		console.log("Error in createTrendingTopicNotification:", error.message);
		throw error;
	}
};

// Create board activity notification
export const createBoardActivityNotification = async (boardId, activityType, userId) => {
	try {
		const board = await Board.findById(boardId).populate("followers");

		// Skip if no followers
		if (!board || !board.followers || board.followers.length === 0) {
			return;
		}

		let content = "";
		switch (activityType) {
			case "new_post":
				content = "New post in a board you follow";
				break;
			case "update":
				content = "A board you follow has been updated";
				break;
			default:
				content = "New activity in a board you follow";
		}

		// Notify all followers except the user who created the activity
		const notifications = board.followers
			.filter(follower => follower._id.toString() !== userId?.toString())
			.map(follower => ({
				from: userId || process.env.SYSTEM_USER_ID,
				to: follower._id,
				type: "board_activity",
				content,
				boardId
			}));

		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
		}
	} catch (error) {
		console.log("Error in createBoardActivityNotification:", error.message);
		throw error;
	}
};

// Create repost notification
export const createRepostNotification = async (postId, userId) => {
	try {
		const post = await Post.findById(postId);
		if (!post) {
			console.log('Post not found when creating repost notification');
			return;
		}

		// Don't create notification if the user is reposting their own post
		if (post.user.toString() === userId.toString()) {
			console.log('User reposting their own post, skipping notification');
			return;
		}

		const notification = new Notification({
			from: userId,
			to: post.user,
			type: "repost",
			referencedPost: postId
		});

		await notification.save();
		console.log('Repost notification created successfully');

		try {
			// Send real-time notification via Socket.io
			io.to(`notifications_${post.user}`).emit('newNotification', notification);
			console.log('Repost notification emitted via socket');
		} catch (socketError) {
			console.error('Error emitting socket notification:', socketError);
		}

		return notification;
	} catch (error) {
		console.error('Error creating repost notification:', error);
	}
};

// Create follow notification
export const createFollowNotification = async (followerId, followedId) => {
	try {
		// Skip if the follower is the same as the followed user (can't follow self)
		if (followerId.toString() === followedId.toString()) {
			return;
		}

		await createNotification({
			from: followerId,
			to: followedId,
			type: "follow",
			content: "started following you"
		});

		console.log(`Follow notification created from ${followerId} to ${followedId}`);
	} catch (error) {
		console.log("Error in createFollowNotification:", error.message);
		throw error;
	}
};

// Create newsbot activity notification
export const createNewsBotActivityNotification = async (botId, content, articles) => {
	try {
		const newsBot = await NewsBot.findById(botId).populate("followers");

		// Skip if no followers
		if (!newsBot || !newsBot.followers || newsBot.followers.length === 0) {
			return;
		}

		const notificationContent = content || `${newsBot.name} posted ${articles.length} new article(s)`;

		// Create notifications for all followers
		const notifications = newsBot.followers.map(follower => ({
			from: process.env.SYSTEM_USER_ID,
			to: follower._id,
			type: "newsbot_activity",
			content: notificationContent,
			newsId: articles.length > 0 ? articles[0]._id : null
		}));

		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
			console.log(`Created ${notifications.length} newsbot activity notifications`);
		}
	} catch (error) {
		console.log("Error in createNewsBotActivityNotification:", error.message);
		throw error;
	}
};

// Create like notification
export const createLikeNotification = async (postId, userId) => {
	try {
		const post = await Post.findById(postId).populate("user");
		if (!post) {
			console.log('Post not found when creating like notification');
			return;
		}

		// Skip if the post creator is the same as the user who liked
		if (post.user._id.toString() === userId.toString()) {
			console.log('User liking their own post, skipping notification');
			return;
		}

		const notification = new Notification({
			from: userId,
			to: post.user._id,
			type: "like",
			content: "liked your post",
			referencedPost: post._id
		});

		await notification.save();
		console.log('Like notification created successfully');

		try {
			// Send real-time notification via Socket.io
			io.to(`notifications_${post.user._id}`).emit('newNotification', notification);
			console.log(`Like notification emitted to ${post.user._id}`);
		} catch (socketError) {
			console.error('Error emitting socket notification:', socketError);
		}

		console.log(`Like notification created from ${userId} to ${post.user._id} for post ${postId}`);
		return notification;
	} catch (error) {
		console.log("Error in createLikeNotification:", error.message);
		throw error;
	}
};

// Create bookmark notification
export const createBookmarkNotification = async (postId, userId) => {
	try {
		const post = await Post.findById(postId).populate("user");
		if (!post) {
			console.log('Post not found when creating bookmark notification');
			return;
		}

		// Skip if the post creator is the same as the user who bookmarked
		if (post.user._id.toString() === userId.toString()) {
			console.log('User bookmarking their own post, skipping notification');
			return;
		}

		const notification = new Notification({
			from: userId,
			to: post.user._id,
			type: "bookmark",
			content: "bookmarked your post",
			referencedPost: post._id
		});

		await notification.save();
		console.log('Bookmark notification created successfully');

		try {
			// Send real-time notification via Socket.io
			io.to(`notifications_${post.user._id}`).emit('newNotification', notification);
			console.log(`Bookmark notification emitted to ${post.user._id}`);
		} catch (socketError) {
			console.error('Error emitting socket notification:', socketError);
		}

		console.log(`Bookmark notification created from ${userId} to ${post.user._id} for post ${postId}`);
		return notification;
	} catch (error) {
		console.log("Error in createBookmarkNotification:", error.message);
		throw error;
	}
};

// Create system announcement notification
export const createSystemAnnouncementNotification = async (title, content, linkUrl) => {
	try {
		// Find all active users
		const users = await User.find({
			"settings.notifications.systemAnnouncements": true
		});

		const notifications = users.map(user => ({
			from: process.env.SYSTEM_USER_ID,
			to: user._id,
			type: "system_announcement",
			content: title || content,
			linkUrl
		}));

		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
		}
	} catch (error) {
		console.log("Error in createSystemAnnouncementNotification:", error.message);
		throw error;
	}
};

export const getNotifications = async (req, res) => {
	try {
		const userId = req.user._id;
		const { page = 1, limit = 20 } = req.query;

		let notifications = await Notification.find({ to: userId })
			.populate({
				path: "from",
				select: "username profileImg",
			})
			.populate({
				path: "post",
				select: "text user",
				populate: {
					path: "user",
					select: "username profileImg"
				}
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
				path: "referencedPost",
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

		// Fix missing post references for older notifications
		notifications = await Promise.all(notifications.map(async (notification) => {
			const notificationObj = notification.toObject();
			
			// For like/repost/bookmark notifications without referencedPost, try to find the post
			if (['like', 'repost', 'bookmark'].includes(notification.type) && !notification.referencedPost) {
				try {
					// Try to find the post from user's posts around the notification creation time
					const timeWindow = 24 * 60 * 60 * 1000; // 24 hours
					const notificationTime = new Date(notification.createdAt);
					const startTime = new Date(notificationTime.getTime() - timeWindow);
					const endTime = new Date(notificationTime.getTime() + timeWindow);
					
					const recentPost = await Post.findOne({
						user: notification.to,
						createdAt: {
							$gte: startTime,
							$lte: endTime
						}
					}).populate({
						path: "user",
						select: "username profileImg"
					}).sort({ createdAt: -1 });
					
					if (recentPost) {
						notificationObj.referencedPost = recentPost;
						console.log(`Fixed missing post reference for notification ${notification._id}`);
					}
				} catch (error) {
					console.error(`Error fixing notification ${notification._id}:`, error);
				}
			}
			
			return notificationObj;
		}));

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