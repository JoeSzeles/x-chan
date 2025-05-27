import Comment from "../models/comment.model.js";
import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Board from "../models/board.model.js";
import { createRepostNotification } from "./notification.controller.js";

export const getComments = async (req, res) => {
	try {
		const { postId } = req.params;

		console.log(`Fetching comments for post ${postId}`);

		// First, get all comments for this post (both top-level and replies)
		const allComments = await Comment.find({ post: postId })
			.populate('user', 'username fullName profileImg')
			.populate({
				path: 'post',
				select: '_id postNumber',
				populate: {
					path: 'user',
					select: 'username fullName profileImg'
				}
			})
			.populate({
				path: 'replies',
				populate: {
					path: 'user',
					select: 'username fullName profileImg'
				}
			})
			.lean();

		console.log(`Found ${allComments.length} comments for post ${postId}`);

		// Separate top-level comments and create a map of all comments
		const topLevelComments = [];
		const commentsMap = new Map();

		// First pass: create map of all comments and identify top-level ones
		allComments.forEach(comment => {
			// Add to map for easy lookup
			commentsMap.set(comment._id.toString(), {
				...comment,
				replies: comment.replies || [] // Initialize empty replies array if none exist
			});

			// If it's a top-level comment, add to that array
			if (!comment.parentComment) {
				topLevelComments.push(comment._id.toString());
			}
		});

		// Second pass: build reply trees
		allComments.forEach(comment => {
			// If this comment has a parent, add it to parent's replies
			if (comment.parentComment) {
				const parentId = comment.parentComment.toString();
				const parent = commentsMap.get(parentId);

				if (parent) {
					parent.replies.push(comment._id.toString());
				} else {
					console.warn(`Parent comment ${parentId} not found for comment ${comment._id}`);
				}
			}
		});

		// Function to recursively expand a comment with its replies
		const expandComment = (commentId) => {
			const comment = commentsMap.get(commentId);
			if (!comment) return null;

			return {
				...comment,
				replies: comment.replies
					.map(replyId => expandComment(replyId))
					.filter(Boolean) // Remove any null replies
			};
		};

		// Build the final result with expanded replies
		const result = topLevelComments
			.map(commentId => expandComment(commentId))
			.filter(Boolean); // Remove any null comments

		console.log(`Returning ${result.length} top-level comments with nested replies`);
		if (result.length > 0) {
			console.log('Sample comment structure:', JSON.stringify(result[0], null, 2));
		}

		res.status(200).json(result);
	} catch (error) {
		console.error("Error in getComments:", error);
		res.status(500).json({ error: error.message });
	}
};

export const createComment = async (req, res, next) => {
	try {
		const { text, img, parentComment } = req.body;
		const { postId } = req.params;
		const userId = req.user._id;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}

		// Check if post exists
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		// Extract mentions from comment text
		const mentionRegex = /@(\w+)/g;
		const mentions = [];
		let match;
		while ((match = mentionRegex.exec(text)) !== null) {
			mentions.push(match[1]);
		}

		// Get the highest post number from both posts and comments
		const [highestPost, highestComment] = await Promise.all([
			Post.findOne({}, {}, { sort: { 'postNumber': -1 } }),
			Comment.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		const nextPostNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;

		const comment = await Comment.create({
			text,
			img,
			user: userId,
			post: postId,
			parentComment,
			postNumber: nextPostNumber,
			likes: [],
			reposts: [],
			bookmarkedBy: [],
			ratings: [],
			viewCount: 0
		});

		// If this is a reply, update the parent comment
		if (parentComment) {
			await Comment.findByIdAndUpdate(parentComment, {
				$push: { replies: comment._id },
			});
		}

		const populatedComment = await Comment.findById(comment._id)
			.populate("user", "username fullName profileImg")
			.populate({
				path: "parentComment",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			})
			.populate("replies");

		// Create notification for comment
		if (post.user.toString() !== userId.toString()) {
			await Notification.create({
				from: userId,
				to: post.user,
				type: "comment",
				post: postId,
				comment: comment._id
			});
		}

		// Create mention notifications for comments
		if (mentions.length > 0) {
			const mentionedUsers = await User.find({ 
				username: { $in: mentions } 
			}).select('_id');

			if (mentionedUsers.length > 0) {
				const { createMentionNotification } = await import('./notification.controller.js');
				await createMentionNotification(
					postId, 
					mentionedUsers.map(u => u._id), 
					userId, 
					`mentioned you in a comment`
				);
			}
		}

		res.status(201).json(populatedComment);
	} catch (error) {
		console.error("Error in createComment: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const deleteComment = async (req, res) => {
	try {
		const { commentId } = req.params;
		const userId = req.user._id;

		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		if (comment.user.toString() !== userId.toString()) {
			return res.status(403).json({ error: "Not authorized to delete this comment" });
		}

		// If this is a reply, remove it from parent comment's replies
		if (comment.parentComment) {
			await Comment.findByIdAndUpdate(comment.parentComment, {
				$pull: { replies: commentId },
			});
		}

		await Comment.findByIdAndDelete(commentId);
		res.status(200).json({ message: "Comment deleted successfully" });
	} catch (error) {
		console.error("Error in deleteComment: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const likeComment = async (req, res) => {
	try {
		const { commentId } = req.params;
		const userId = req.user._id;

		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		const isLiked = comment.likes.includes(userId);

		if (isLiked) {
			// Unlike
			comment.likes = comment.likes.filter(
				(id) => id.toString() !== userId.toString()
			);
		} else {
			// Like
			comment.likes.push(userId);
		}

		await comment.save();

		// Return the updated comment with populated user data
		const updatedComment = await Comment.findById(commentId)
			.populate("user", "username fullName profileImg")
			.populate("replies");

		res.status(200).json({ 
			likes: updatedComment.likes,
			message: isLiked ? "Comment unliked successfully" : "Comment liked successfully"
		});
	} catch (error) {
		console.error("Error in likeComment: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const trackView = async (req, res) => {
	try {
		const { commentId } = req.params;
		await Comment.findByIdAndUpdate(commentId, {
			$inc: { viewCount: 1 },
		});
		res.status(200).json({ message: "View tracked successfully" });
	} catch (error) {
		console.error("Error in trackView: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const bookmarkComment = async (req, res) => {
	try {
		const { commentId } = req.params;
		const userId = req.user._id;

		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		// Ensure bookmarkedBy is an array
		if (!Array.isArray(comment.bookmarkedBy)) {
			comment.bookmarkedBy = [];
		}

		const isBookmarked = comment.bookmarkedBy.includes(userId);

		if (isBookmarked) {
			// Remove bookmark
			comment.bookmarkedBy = comment.bookmarkedBy.filter(
				(id) => id.toString() !== userId.toString()
			);
		} else {
			// Add bookmark
			comment.bookmarkedBy.push(userId);
		}

		await comment.save();

		// Return the updated comment with populated user data
		const updatedComment = await Comment.findById(commentId)
			.populate("user", "username fullName profileImg")
			.populate("replies");

		// Ensure we always return an array even if population failed
		const bookmarkedByArray = Array.isArray(updatedComment.bookmarkedBy) ? updatedComment.bookmarkedBy : [];

		res.status(200).json({ 
			bookmarkedBy: bookmarkedByArray,
			isBookmarked: !isBookmarked,
			message: isBookmarked ? "Comment unbookmarked successfully" : "Comment bookmarked successfully"
		});
	} catch (error) {
		console.error("Error in bookmarkComment: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const repostComment = async (req, res) => {
	try {
		const { id: commentId } = req.params;
		const { repostType = 'personal' } = req.body;
		const userId = req.user._id;

		console.log('=== REPOST COMMENT START ===');
		console.log('Request params:', { commentId, userId, repostType });
		console.log('User from req.user:', req.user);

		// Find the original comment
		console.log('Step 1: Finding original comment...');
		const originalComment = await Comment.findById(commentId)
			.populate('user', 'username fullName profileImg')
			.populate('post', '_id postNumber');

		console.log('Original comment found:', originalComment ? 'YES' : 'NO');
		if (originalComment) {
			console.log('Original comment details:', {
				id: originalComment._id,
				text: originalComment.text?.substring(0, 50) + '...',
				user: originalComment.user?.username,
				postId: originalComment.post?._id,
				repostCount: originalComment.repostCount
			});
		}

		if (!originalComment) {
			console.log('ERROR: Comment not found:', commentId);
			return res.status(404).json({ error: 'Comment not found' });
		}

		console.log('Step 2: Finding user...');
		const user = await User.findById(userId);
		console.log('User found:', user ? 'YES' : 'NO');
		if (user) {
			console.log('User details:', {
				id: user._id,
				username: user.username,
				reposts: user.reposts?.length || 0
			});
		}

		if (!user) {
			console.log('ERROR: User not found:', userId);
			return res.status(404).json({ error: 'User not found' });
		}

		// Check if user has already reposted this comment
		console.log('Step 3: Checking for existing repost...');
		const existingRepost = await Post.findOne({
			user: userId,
			originalComment: commentId
		});

		console.log('Existing repost found:', existingRepost ? 'YES' : 'NO');
		if (existingRepost) {
			console.log('Existing repost details:', {
				id: existingRepost._id,
				postNumber: existingRepost.postNumber
			});
		}

		if (existingRepost) {
			console.log('Step 3a: Removing existing repost...');
			try {
				// Remove existing repost
				await Post.findByIdAndDelete(existingRepost._id);
				console.log('Existing repost deleted successfully');

				// Update user's reposts array if it exists
				if (user.reposts && user.reposts.includes(commentId)) {
					console.log('Updating user reposts array...');
					await User.findByIdAndUpdate(userId, { $pull: { reposts: commentId } });
					console.log('User reposts array updated');
				}

				// Decrease repost count on original comment
				console.log('Decreasing repost count...');
				const updatedComment = await Comment.findByIdAndUpdate(
					commentId, 
					{ $inc: { repostCount: -1 } },
					{ new: true }
				);
				console.log('Repost count decreased:', updatedComment.repostCount);

				console.log('=== UNREPOST SUCCESSFUL ===');
				return res.status(200).json({ 
					message: 'Comment unreposted',
					reposts: [],
					repostCount: Math.max(0, updatedComment.repostCount || 0)
				});
			} catch (unrepostError) {
				console.error('ERROR during unrepost:', unrepostError);
				throw unrepostError;
			}
		}

		// Get the highest post number for the new repost
		console.log('Step 4: Getting next post number...');
		const [highestPost, highestComment] = await Promise.all([
			Post.findOne({}, {}, { sort: { 'postNumber': -1 } }),
			Comment.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		const nextPostNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;

		console.log('Post numbers:', {
			highestPost: highestPostNumber,
			highestComment: highestCommentNumber,
			nextPostNumber: nextPostNumber
		});

		// Create new repost
		console.log('Step 5: Creating repost data...');
		const repostData = {
			user: userId,
			text: originalComment.text,
			postNumber: nextPostNumber,
			isRepost: true,
			originalComment: commentId,
			likes: [],
			reposts: [],
			comments: [],
			bookmarkedBy: [],
			ratings: [],
			viewCount: 0
		};

		// Copy media if present
		if (originalComment.img) {
			console.log('Copying image from original comment');
			repostData.img = originalComment.img;
		}

		console.log('Repost data prepared:', {
			user: repostData.user,
			textLength: repostData.text?.length,
			postNumber: repostData.postNumber,
			hasImg: !!repostData.img
		});

		console.log('Step 6: Saving new repost...');
		const newRepost = new Post(repostData);
		await newRepost.save();
		console.log('Repost created successfully:', {
			id: newRepost._id,
			postNumber: newRepost.postNumber
		});

		// Update user's reposts array - ensure reposts array exists
		console.log('Step 7: Updating user reposts array...');
		await User.findByIdAndUpdate(
			userId, 
			{ $push: { reposts: commentId } },
			{ upsert: false }
		);
		console.log('User reposts array updated successfully');

		// Increment repost count on original comment
		console.log('Step 8: Incrementing repost count...');
		const updatedComment = await Comment.findByIdAndUpdate(
			commentId, 
			{ $inc: { repostCount: 1 } },
			{ new: true }
		);
		console.log('Repost count incremented:', {
			commentId: commentId,
			newRepostCount: updatedComment.repostCount
		});

		// Create notification for the original author (only if not reposting own comment)
		console.log('Step 9: Creating notification...');
		if (originalComment.user._id.toString() !== userId.toString()) {
			try {
				await createRepostNotification(commentId, userId);
				console.log('Notification created for repost');
			} catch (notificationError) {
				console.error('Failed to create notification:', notificationError);
				// Don't fail the entire request if notification fails
			}
		} else {
			console.log('Skipping notification - user reposting own comment');
		}

		// Populate the new repost for response
		console.log('Step 10: Populating repost for response...');
		const populatedRepost = await Post.findById(newRepost._id)
			.populate('user', 'username fullName profileImg')
			.populate({
				path: 'originalComment',
				select: 'text img user postNumber',
				populate: {
					path: 'user',
					select: 'username fullName profileImg'
				}
			});

		console.log('Populated repost:', {
			id: populatedRepost._id,
			user: populatedRepost.user?.username,
			originalComment: populatedRepost.originalComment?._id
		});

		// Create repost text using the correct format
		const repostText = `Reposted by @${originalComment.user.username} from comment >>${originalComment.postNumber.toString().padStart(10, '0')}\n\n${originalComment.text}`;

		const responseData = { 
			message: 'Comment reposted successfully',
			repost: populatedRepost,
			reposts: [userId],
			repostCount: updatedComment.repostCount || 1
		};

		console.log('=== REPOST SUCCESSFUL ===');
		console.log('Response data:', {
			message: responseData.message,
			repostId: responseData.repost._id,
			repostCount: responseData.repostCount
		});

		res.status(200).json(responseData);
	} catch (error) {
		console.error('=== REPOST ERROR ===');
		console.error('Error in repostComment function:', error);
		console.error('Error name:', error.name);
		console.error('Error message:', error.message);
		console.error('Error stack:', error.stack);

		// Log additional context
		console.error('Request context:', {
			commentId: req.params.id,
			userId: req.user?._id,
			userAgent: req.headers['user-agent'],
			method: req.method,
			url: req.url
		});

		res.status(500).json({ error: 'Internal Server Error: ' + error.message });
	}
};

export const rateComment = async (req, res) => {
	try {
		const { commentId } = req.params;
		const { rating } = req.body;
		const userId = req.user._id;

		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		// Check if user has already rated this comment
		const existingRatingIndex = comment.ratings.findIndex(
			(r) => r.user.toString() === userId.toString()
		);

		if (existingRatingIndex !== -1) {
			// Update existing rating
			comment.ratings[existingRatingIndex].rating = rating;
		} else {
			// Add new rating
			comment.ratings.push({ user: userId, rating });
		}

		await comment.save();

		// Return the updated comment with populated user data
		const updatedComment = await Comment.findById(commentId)
			.populate("user", "username fullName profileImg")
			.populate("replies");

		res.status(200).json({ 
			ratings: updatedComment.ratings,
			message: existingRatingIndex !== -1 ? "Rating updated successfully" : "Rating added successfully"
		});
	} catch (error) {
		console.error("Error in rateComment: ", error);
		res.status(500).json({ error: error.message });
	}
};

export const getCommentQuotes = async (req, res, next) => {
	try {
		const { commentId } = req.params;

		// Get the post number for this comment
		const comment = await Comment.findById(commentId).select('postNumber');
		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		// Find all comments that reference this comment's post number
		const quotes = await Comment.find({
			text: { $regex: `>>${comment.postNumber.toString().padStart(10, '0')}` }
		})
		.select('postNumber')
		.sort({ createdAt: 1 });

		res.status(200).json({
			quotes: quotes.map(quote => quote.postNumber)
		});
	} catch (error) {
		next(error);
	}
};

export const getCommentById = async (req, res) => {
	try {
		const { id } = req.params;

		const comment = await Comment.findById(id)
			.populate("user", "username fullName profileImg")
			.populate({
				path: "post",
				select: "_id postNumber",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			})
			.populate({
				path: "replies",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			});

		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		res.status(200).json(comment);
	} catch (error) {
		console.error("Error in getCommentById:", error);
		res.status(500).json({ error: error.message });
	}
};