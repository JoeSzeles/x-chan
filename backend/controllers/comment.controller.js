import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import Notification from "../models/notification.model.js";

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

export const createComment = async (req, res) => {
	try {
		const { postId } = req.params;
		const { text, img, parentComment } = req.body;
		const userId = req.user._id;

		if (!text) {
			return res.status(400).json({ error: "Text field is required" });
		}

		// Check if post exists
		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
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
		const { commentId } = req.params;
		
		// Verify user is authenticated
		if (!req.user || !req.user._id) {
			return res.status(401).json({ error: "You must be logged in to repost" });
		}
		
		const userId = req.user._id;
		const { repostType, targetBoard } = req.body;

		const comment = await Comment.findById(commentId)
			.populate("user", "username fullName profileImg")
			.populate("post");

		if (!comment) {
			return res.status(404).json({ error: "Comment not found" });
		}

		const isReposted = comment.reposts.includes(userId);

		if (isReposted) {
			// Remove repost
			comment.reposts = comment.reposts.filter(
				(id) => id.toString() !== userId.toString()
			);
			await comment.save();

			// Delete the repost post if it exists
			await Post.findOneAndDelete({
				originalComment: commentId,
				user: userId
			});

			return res.status(200).json({ 
				reposts: comment.reposts,
				message: "Comment un-reposted successfully"
			});
		}

		// Add repost to comment
		comment.reposts.push(userId);
		await comment.save();

		// Create a new post for the reposted comment
		const newRepost = new Post({
			user: userId,
			text: comment.text,
			img: comment.img,
			originalComment: commentId,
			originalPost: comment.post._id,
			reposts: [],
			likes: [],
			comments: [],
			viewCount: 0
		});

		// If reposting to a board, add board information
		if (repostType === 'board' && targetBoard) {
			newRepost.board = targetBoard;
		}

		await newRepost.save();

		// Create notification if not reposting own comment
		if (comment.user._id.toString() !== userId.toString()) {
			const notification = new Notification({
				from: userId,
				to: comment.user._id,
				type: "repost",
				comment: commentId
			});
			await notification.save();
		}

		// Return the updated comment with populated user data
		const updatedComment = await Comment.findById(commentId)
			.populate("user", "username fullName profileImg")
			.populate("replies");

		res.status(200).json({ 
			reposts: updatedComment.reposts,
			message: "Comment reposted successfully"
		});
	} catch (error) {
		console.error("Error in repostComment: ", error);
		res.status(500).json({ error: error.message });
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
import mongoose from "mongoose";
import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import Board from "../models/board.model.js";
import { createRepostNotification } from "./notification.controller.js";

export const repostComment = async (req, res) => {
	try {
		const { id: commentId } = req.params;
		const userId = req.user._id;
		const { repostType, targetBoard } = req.body;

		const comment = await Comment.findById(commentId);
		if (!comment) {
			return res.status(404).json({ error: 'Comment not found' });
		}

		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Check if user has already reposted this comment
		const existingRepost = await Post.findOne({
			user: userId,
			originalComment: commentId
		});

		if (existingRepost) {
			// Remove existing repost
			await Post.findByIdAndDelete(existingRepost._id);
			await Comment.findByIdAndUpdate(commentId, { $pull: { reposts: userId } });

			// Remove from board if it was a board repost
			if (existingRepost.board) {
				await Board.findByIdAndUpdate(existingRepost.board, {
					$pull: { posts: existingRepost._id }
				});
			}

			const updatedComment = await Comment.findById(commentId);
			return res.status(200).json({ 
				message: 'Comment unreposted',
				reposts: updatedComment.reposts
			});
		}

		// Get the highest post number for the new repost
		const [highestPost, highestComment] = await Promise.all([
			Post.findOne({}, {}, { sort: { 'postNumber': -1 } }),
			Comment.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		const nextPostNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;

		// Create the repost as a new post
		const repostData = {
			user: userId,
			text: `Reposted comment: ${comment.text.substring(0, 100)}${comment.text.length > 100 ? '...' : ''}`,
			originalComment: commentId,
			postNumber: nextPostNumber,
			likes: [],
			reposts: [],
			comments: [],
			bookmarkedBy: [],
			ratings: [],
			viewCount: 0
		};

		// Handle board repost
		if (repostType === 'board' && targetBoard) {
			const board = await Board.findOne({ name: targetBoard, user: userId });
			if (board) {
				repostData.board = board._id;
			}
		}

		const newRepost = new Post(repostData);
		await newRepost.save();

		// Add repost to board's posts array if applicable
		if (repostData.board) {
			await Board.findByIdAndUpdate(repostData.board, {
				$push: { posts: newRepost._id }
			});
		}

		// Update comment's reposts array
		await Comment.findByIdAndUpdate(commentId, { $push: { reposts: userId } });

		// Create notification for the original comment author
		if (comment.user.toString() !== userId.toString()) {
			await createRepostNotification(commentId, userId);
		}

		// Get updated comment with reposts
		const updatedComment = await Comment.findById(commentId);

		res.status(200).json({ 
			message: 'Comment reposted successfully',
			reposts: updatedComment.reposts,
			repost: newRepost
		});
	} catch (error) {
		console.log('Error in repostComment function', error.message);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};
