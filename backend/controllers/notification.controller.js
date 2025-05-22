import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import Thread from "../models/thread.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Board from "../models/board.model.js";
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

// Create news bot activity notification
export const createNewsBotActivityNotification = async (botId, articleId, headline) => {
	try {
		// Find the bot
		const bot = await NewsBot.findById(botId);
		if (!bot) return;
		
		// Find users who follow this bot
		const followers = await User.find({ following: botId });
		
		if (followers.length === 0) return;
		
		const notifications = followers.map(user => ({
			from: process.env.SYSTEM_USER_ID,
			to: user._id,
			type: "news_bot_activity",
			content: `${bot.name} posted: ${headline}`,
			newsId: articleId
		}));
		
		await Notification.insertMany(notifications);
	} catch (error) {
		console.log("Error in createNewsBotActivityNotification:", error.message);
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

// Create repost notification
export const createRepostNotification = async (originalPostId, reposterId) => {
	try {
		const post = await Post.findById(originalPostId).populate("user");
		if (post.user._id.toString() !== reposterId.toString()) {
			await createNotification({
				from: reposterId,
				to: post.user._id,
				type: "repost",
				content: "reposted your post",
				postId: originalPostId,
				referencedPost: originalPostId
			});
		}
	} catch (error) {
		console.log("Error in createRepostNotification:", error.message);
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
				content: "replied to your comment",
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

// Create follow notification
export const createFollowNotification = async (followerId, followedUserId) => {
	try {
		await createNotification({
			from: followerId,
			to: followedUserId,
			type: "follow",
			content: "started following you"
		});
	} catch (error) {
		console.log("Error in createFollowNotification:", error.message);
		throw error;
	}
};

// Create comment reply notification
export const createCommentReplyNotification = async (commentId, postId, userId, commentText) => {
	try {
		const comment = await Comment.findById(commentId).populate("user");
		if (comment && comment.user._id.toString() !== userId.toString()) {
			await createNotification({
				from: userId,
				to: comment.user._id,
				type: "comment_reply",
				content: "replied to your comment",
				postId
			});
		}
	} catch (error) {
		console.log("Error in createCommentReplyNotification:", error.message);
		throw error;
	}
};

// Create board activity notification 
export const createBoardActivityNotification = async (boardId, activityType, userId, postId = null) => {
	try {
		const board = await Board.findById(boardId).populate("followers");
		
		// Skip if no followers
		if (!board || !board.followers || board.followers.length === 0) {
			return;
		}
		
		let content = "";
		switch (activityType) {
			case "new_post":
				content = `New post in "${board.name}"`;
				break;
			case "update":
				content = `"${board.name}" board has been updated`;
				break;
			case "comment":
				content = `New comment in "${board.name}" board`;
				break;
			default:
				content = `New activity in "${board.name}" board`;
		}
		
		// Notify all followers except the user who created the activity
		const notifications = board.followers
			.filter(follower => follower._id.toString() !== userId?.toString())
			.map(follower => ({
				from: userId || process.env.SYSTEM_USER_ID,
				to: follower._id,
				type: "board_activity",
				content,
				boardId,
				postId
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
export const createRepostNotification = async (originalPostId, reposterId) => {
	try {
		const post = await Post.findById(originalPostId).populate("user");
		if (post && post.user._id.toString() !== reposterId.toString()) {
			await createNotification({
				from: reposterId,
				to: post.user._id,
				type: "repost",
				content: "reposted your post",
				postId: originalPostId
			});
		}
	} catch (error) {
		console.log("Error in createRepostNotification:", error.message);
		throw error;
	}
};

// Create news bot activity notification
export const createNewsBotActivityNotification = async (botId, articleId, headline) => {
	try {
		// Find users who have news notifications enabled
		const users = await User.find({ "settings.notifications.news": true });
		
		if (users.length === 0) return;
		
		const notifications = users.map(user => ({
			from: process.env.SYSTEM_USER_ID,
			to: user._id,
			type: "news_bot_activity",
			content: headline,
			newsId: articleId
		}));
		
		await Notification.insertMany(notifications);
	} catch (error) {
		console.log("Error in createNewsBotActivityNotification:", error.message);
		throw error;
	}
};

// Create thread activity notification
export const createThreadActivityNotification = async (threadId, userId, action) => {
	try {
		const thread = await Thread.findById(threadId);
		if (!thread) return;
		
		// Find thread followers
		const threadFollowers = thread.followers || [];
		
		// Filter out the user who performed the action
		const recipients = threadFollowers.filter(
			followerId => followerId.toString() !== userId.toString()
		);
		
		if (recipients.length === 0) return;
		
		const content = `New ${action} in thread "${thread.title || 'Untitled thread'}"`;
		
		const notifications = recipients.map(recipientId => ({
			from: userId,
			to: recipientId,
			type: "thread_activity",
			content,
			threadId
		}));
		
		await Notification.insertMany(notifications);
	} catch (error) {
		console.log("Error in createThreadActivityNotification:", error.message);
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
export const createBoardActivityNotification = async (boardId, activityType, userId, postId = null) => {
	try {
		const board = await Board.findById(boardId).populate("followers");
		
		// Skip if no followers
		if (!board || !board.followers || board.followers.length === 0) {
			return;
		}
		
		let content = "";
		switch (activityType) {
			case "new_post":
				content = `New post in "${board.name}"`;
				break;
			case "update":
				content = `"${board.name}" board has been updated`;
				break;
			case "comment":
				content = `New comment in "${board.name}" board`;
				break;
			default:
				content = `New activity in "${board.name}" board`;
		}
		
		// Notify all followers except the user who created the activity
		const notifications = board.followers
			.filter(follower => follower._id.toString() !== userId?.toString())
			.map(follower => ({
				from: userId || process.env.SYSTEM_USER_ID,
				to: follower._id,
				type: "board_activity",
				content,
				boardId,
				postId
			}));
		
		if (notifications.length > 0) {
			await Notification.insertMany(notifications);
		}
	} catch (error) {
		console.log("Error in createBoardActivityNotification:", error.message);
		throw error;
	}
};

// Create user board activity notification
export const createUserBoardActivityNotification = async (boardId, activityType, userId, postId = null) => {
	try {
		const board = await Board.findById(boardId);
		
		// Skip if board doesn't exist
		if (!board) return;
		
		// Only notify the board owner if different from the action user
		if (board.creator.toString() === userId.toString()) return;
		
		let content = "";
		switch (activityType) {
			case "new_post":
				content = `New post in your board "${board.name}"`;
				break;
			case "comment":
				content = `New comment in your board "${board.name}"`;
				break;
			default:
				content = `New activity in your board "${board.name}"`;
		}
		
		await createNotification({
			from: userId,
			to: board.creator,
			type: "user_board_activity",
			content,
			boardId,
			postId
		});
	} catch (error) {
		console.log("Error in createUserBoardActivityNotification:", error.message);
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

		const notifications = await Notification.find({ to: userId })
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

// Create post rating notification
export const createPostRatingNotification = async (postId, raterUserId, rating) => {
  try {
    const post = await Post.findById(postId).populate("user");
    if (post.user._id.toString() !== raterUserId.toString()) {
      await createNotification({
        from: raterUserId,
        to: post.user._id,
        type: "post_rating",
        content: `rated your post ${rating} stars`,
        postId
      });
    }
  } catch (error) {
    console.log("Error in createPostRatingNotification:", error.message);
    throw error;
  }
};

// Create achievement notification
export const createAchievementNotification = async (userId, achievementName, description) => {
  try {
    await createNotification({
      from: process.env.SYSTEM_USER_ID,
      to: userId,
      type: "achievement",
      content: `You earned the "${achievementName}" achievement! ${description}`
    });
  } catch (error) {
    console.log("Error in createAchievementNotification:", error.message);
    throw error;
  }
};

// Create content recommendation notification
export const createContentRecommendationNotification = async (userId, contentType, contentId, reason) => {
  try {
    let contentField = {};
    
    switch (contentType) {
      case 'post':
        contentField = { postId: contentId };
        break;
      case 'news':
        contentField = { newsId: contentId };
        break;
      case 'service':
        contentField = { serviceId: contentId };
        break;
      case 'thread':
        contentField = { threadId: contentId };
        break;
    }
    
    await createNotification({
      from: process.env.SYSTEM_USER_ID,
      to: userId,
      type: "content_recommendation",
      content: `We thought you might like this ${contentType}: ${reason}`,
      ...contentField
    });
  } catch (error) {
    console.log("Error in createContentRecommendationNotification:", error.message);
    throw error;
  }
};

// Create user mention reaction notification
export const createMentionReactionNotification = async (mentionId, postId, reactorId, reactionType) => {
  try {
    const post = await Post.findById(postId).populate("user");
    
    await createNotification({
      from: reactorId,
      to: post.user._id,
      type: "user_mention_reaction",
      content: `reacted with "${reactionType}" to their mention of you`,
      postId
    });
  } catch (error) {
    console.log("Error in createMentionReactionNotification:", error.message);
    throw error;
  }
};

// Create scheduled reminder notification
export const createScheduledReminderNotification = async (userId, reminderContent, relevantPostId = null) => {
  try {
    const notification = {
      from: process.env.SYSTEM_USER_ID,
      to: userId,
      type: "scheduled_reminder",
      content: reminderContent
    };
    
    if (relevantPostId) {
      notification.postId = relevantPostId;
    }
    
    await createNotification(notification);
  } catch (error) {
    console.log("Error in createScheduledReminderNotification:", error.message);
    throw error;
  }
};

// Create bookmark activity notification
export const createBookmarkActivityNotification = async (userId, bookmarkId, activityType) => {
  try {
    const bookmark = await Bookmark.findById(bookmarkId).populate('post');
    
    if (!bookmark) return;
    
    let content = "";
    switch (activityType) {
      case "update":
        content = "A post you bookmarked has been updated";
        break;
      case "comment":
        content = "Someone commented on a post you bookmarked";
        break;
      case "trending":
        content = "A post you bookmarked is trending";
        break;
    }
    
    await createNotification({
      from: process.env.SYSTEM_USER_ID,
      to: userId,
      type: "bookmark_activity",
      content,
      postId: bookmark.post._id
    });
  } catch (error) {
    console.log("Error in createBookmarkActivityNotification:", error.message);
    throw error;
  }
};

// Create user joined notification
export const createUserJoinedNotification = async (newUserId) => {
  try {
    // Get system admin or a designated welcoming user
    const adminId = process.env.SYSTEM_USER_ID || process.env.ADMIN_USER_ID;
    
    await createNotification({
      from: adminId,
      to: newUserId,
      type: "user_joined",
      content: "Welcome to our community! Here are some tips to get started..."
    });
  } catch (error) {
    console.log("Error in createUserJoinedNotification:", error.message);
    throw error;
  }
};

// Create post featured notification
export const createPostFeaturedNotification = async (postId, reason) => {
  try {
    const post = await Post.findById(postId).populate("user");
    
    await createNotification({
      from: process.env.SYSTEM_USER_ID,
      to: post.user._id,
      type: "post_featured",
      content: `Your post has been featured ${reason ? `for ${reason}` : 'on our platform'}!`,
      postId
    });
  } catch (error) {
    console.log("Error in createPostFeaturedNotification:", error.message);
    throw error;
  }
};

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
