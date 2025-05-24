import Notification from "../models/notification.model.js";
import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import User from "../models/user.model.js";
import Comment from "../models/comment.model.js";
import { createRepostNotification } from "./notification.controller.js";
import { v2 as cloudinary } from "cloudinary";
import { handleImageUpload, getImageUrl } from "../utils/imageUpload.js";
import path from "path";
import fs from "fs";
import { errorHandler } from "../utils/error.js";
import Board from "../models/board.model.js";

export const createPost = async (req, res) => {
	try {
		const { text, videoUrl, title, boardId } = req.body;
		let { img } = req.body;
		const userId = req.user._id.toString();

		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ message: "User not found" });

		if (!text && !img && !videoUrl) {
			return res.status(400).json({ error: "Post must have text, image, or video" });
		}

		if (img) {
			// Check if base64 string is too large (roughly 5MB)
			const base64Size = Math.ceil((img.length * 3) / 4);
			if (base64Size > 5 * 1024 * 1024) {
				return res.status(413).json({ error: "Image size too large. Maximum size is 5MB" });
			}

			try {
				// Upload image to Cloudinary
				const uploadedResponse = await cloudinary.uploader.upload(img, {
					folder: "posts",
					resource_type: "auto",
					quality: "auto",
					fetch_format: "auto"
				});
				img = uploadedResponse.secure_url;
			} catch (error) {
				console.error("Error uploading to Cloudinary:", error);
				return res.status(500).json({ error: "Error uploading image" });
			}
		}

		// Get the highest post number from both posts and comments
		const [highestPost, highestComment] = await Promise.all([
			Post.findOne({}, {}, { sort: { 'postNumber': -1 } }),
			Comment.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		const nextPostNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;

		const newPost = new Post({
			user: userId,
			title,
			text,
			img,
			videoUrl,
			postNumber: nextPostNumber,
			board: boardId
		});

		await newPost.save();

		// If boardId is provided, add the post to the board's posts array
		if (boardId) {
			await Board.findByIdAndUpdate(boardId, {
				$push: { posts: newPost._id }
			});
		}

		res.status(201).json(newPost);
	} catch (error) {
		console.error("Error in createPost controller:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const deletePost = async (req, res) => {
	try {
		const post = await Post.findById(req.params.id);
		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		if (post.user.toString() !== req.user._id.toString()) {
			return res.status(401).json({ error: "You are not authorized to delete this post" });
		}

		if (post.img) {
			try {
				// Extract public_id from Cloudinary URL
				const publicId = post.img.split('/').pop().split('.')[0];
				await cloudinary.uploader.destroy(`posts/${publicId}`);
			} catch (error) {
				console.error("Error deleting image from Cloudinary:", error);
			}
		}

		// If the post is associated with a board, remove it from the board's posts array
		if (post.board) {
			await Board.findByIdAndUpdate(post.board, {
				$pull: { posts: post._id }
			});
		}

		await Post.findByIdAndDelete(req.params.id);

		res.status(200).json({ message: "Post deleted successfully" });
	} catch (error) {
		console.error("Error in deletePost controller:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const commentOnPost = async (req, res, next) => {
	try {
		const { text, img } = req.body;
		const postId = req.params.id;
		const userId = req.user._id;

		if (!text) {
			return next(errorHandler(400, "Text field is required"));
		}

		const post = await Post.findById(postId);
		if (!post) {
			return next(errorHandler(404, "Post not found"));
		}

		// Get the highest post number from both posts and comments
		const [highestPost, highestComment] = await Promise.all([
			Post.findOne({}, {}, { sort: { 'postNumber': -1 } }),
			Comment.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		const nextPostNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;

		const comment = {
			user: userId,
			text,
			img,
			postNumber: nextPostNumber,
			likes: [],
			reposts: [],
			bookmarkedBy: [],
			ratings: [],
			viewCount: 0
		};

		post.comments.push(comment);
		await post.save();

		// Populate the user data for the new comment
		const populatedPost = await Post.findById(postId)
			.populate({
				path: "comments.user",
				select: "username fullName profileImg"
			})
			.populate({
				path: "user",
				select: "-password"
			});

		res.status(200).json(populatedPost);
	} catch (error) {
		next(error);
	}
};

export const likeComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;

		console.log('Liking comment:', { postId, commentId, userId });

		const post = await Post.findById(postId);
		if (!post) {
			console.log('Post not found:', postId);
			return res.status(404).json({ error: "Post not found" });
		}

		// Find the comment in the comments array
		const commentIndex = post.comments.findIndex(comment => comment._id.toString() === commentId);
		console.log('Comment index:', commentIndex);

		if (commentIndex === -1) {
			console.log('Comment not found:', commentId);
			return res.status(404).json({ error: "Comment not found" });
		}

		const comment = post.comments[commentIndex];
		console.log('Found comment:', comment);

		const likeIndex = comment.likes.findIndex(id => id.toString() === userId.toString());
		console.log('Like index:', likeIndex);

		if (likeIndex === -1) {
			// Add like
			console.log('Adding like');
			post.comments[commentIndex].likes.push(userId);
		} else {
			// Remove like
			console.log('Removing like');
			post.comments[commentIndex].likes.splice(likeIndex, 1);
		}

		await post.save();
		console.log('Post saved successfully');

		// Create notification for comment like
		if (likeIndex === -1 && comment.user.toString() !== userId.toString()) {
			console.log('Creating notification');
			await Notification.create({
				from: userId,
				to: comment.user,
				type: "like",
				post: postId
			});
			console.log('Notification created');
		}

		res.status(200).json({ message: "Comment like updated successfully" });
	} catch (error) {
		console.error('Error in likeComment:', error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const deleteComment = async (req, res) => {
	try {
		const { postId, commentId } = req.params;
		const userId = req.user._id;

		console.log('Deleting comment:', { postId, commentId, userId });

		const post = await Post.findById(postId);
		if (!post) {
			console.log('Post not found:', postId);
			return res.status(404).json({ error: "Post not found" });
		}

		// Find the comment in the comments array
		const commentIndex = post.comments.findIndex(comment => comment._id.toString() === commentId);
		console.log('Comment index:', commentIndex);

		if (commentIndex === -1) {
			console.log('Comment not found:', commentId);
			return res.status(404).json({ error: "Comment not found" });
		}

		const comment = post.comments[commentIndex];
		console.log('Found comment:', comment);

		// Check if user is the comment author
		if (comment.user.toString() !== userId.toString()) {
			console.log('Unauthorized delete attempt:', { commentUser: comment.user, requestUser: userId });
			return res.status(403).json({ error: "You can only delete your own comments" });
		}

		// Remove the comment
		console.log('Removing comment at index:', commentIndex);
		post.comments.splice(commentIndex, 1);
		await post.save();
		console.log('Post saved successfully');

		res.status(200).json({ message: "Comment deleted successfully" });
	} catch (error) {
		console.error('Error in deleteComment:', error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const likeUnlikePost = async (req, res) => {
	try {
		const userId = req.user._id;
		const { id: postId } = req.params;

		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		const userLikedPost = post.likes.includes(userId);

		if (userLikedPost) {
			// Unlike post
			await Post.updateOne({ _id: postId }, { $pull: { likes: userId } });
			await User.updateOne({ _id: userId }, { $pull: { likedPosts: postId } });

			const updatedLikes = post.likes.filter((id) => id.toString() !== userId.toString());
			res.status(200).json(updatedLikes);
		} else {
			// Like post
			post.likes.push(userId);
			await User.updateOne({ _id: userId }, { $push: { likedPosts: postId } });
			await post.save();

			const notification = new Notification({
				from: userId,
				to: post.user,
				type: "like",
			});
			await notification.save();

			const updatedLikes = post.likes;
			res.status(200).json(updatedLikes);
		}
	} catch (error) {
		console.log("Error in likeUnlikePost controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getAllPosts = async (req, res, next) => {
	try {
		const posts = await Post.find()
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "username fullName profileImg",
			})
			.populate({
				path: "originalPost",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			});

		if (posts.length === 0) {
			return res.status(200).json([]);
		}

		// Add isRepost flag to each post
		const postsWithRepostFlag = posts.map(post => ({
			...post.toObject(),
			isRepost: post.originalPost ? true : false
		}));

		res.status(200).json(postsWithRepostFlag);
	} catch (error) {
		next(error);
	}
};

export const getLikedPosts = async (req, res) => {
	const userId = req.params.id;

	try {
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const likedPosts = await Post.find({ _id: { $in: user.likedPosts } })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			});

		res.status(200).json(likedPosts);
	} catch (error) {
		console.log("Error in getLikedPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getFollowingPosts = async (req, res) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		const following = user.following;

		const feedPosts = await Post.find({ user: { $in: following } })
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			})
			.populate({
				path: "originalPost",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			});

		// Add isRepost flag to each post
		const postsWithRepostFlag = feedPosts.map(post => ({
			...post.toObject(),
			isRepost: post.originalPost ? true : false
		}));

		res.status(200).json(postsWithRepostFlag);
	} catch (error) {
		console.log("Error in getFollowingPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getUserPosts = async (req, res) => {
	try {
		const { username } = req.params;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ error: "User not found" });

		// Get both original posts and reposts
		const posts = await Post.find({
			$or: [
				{ user: user._id },  // Original posts
				{ user: user._id, originalPost: { $exists: true } }  // Reposts
			]
		})
			.sort({ createdAt: -1 })
			.populate({
				path: "user",
				select: "-password",
			})
			.populate({
				path: "comments.user",
				select: "-password",
			})
			.populate({
				path: "originalPost",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			});

		// Add isRepost flag to each post
		const postsWithRepostFlag = posts.map(post => ({
			...post.toObject(),
			isRepost: post.originalPost ? true : false
		}));

		res.status(200).json(postsWithRepostFlag);
	} catch (error) {
		console.log("Error in getUserPosts controller: ", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const repostPost = async (req, res) => {
	try {
		const { id: postId } = req.params;
		const userId = req.user._id;

		const post = await Post.findById(postId);
		if (!post) {
			return res.status(404).json({ error: 'Post not found' });
		}

		// Check if user has already reposted the post
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Ensure reposts array exists
		if (!user.reposts) {
			// Initialize reposts array if it doesn't exist
			await User.findByIdAndUpdate(userId, { reposts: [] });
			user.reposts = [];
		}

		const hasReposted = user.reposts && user.reposts.includes(postId);

		if (hasReposted) {
			// Unrepost
			await User.findByIdAndUpdate(userId, { $pull: { reposts: postId } });
			await Post.findByIdAndUpdate(postId, { $inc: { repostCount: -1 } });
			return res.status(200).json({ message: 'Post unreposted' });
		}

		// Repost
		await User.findByIdAndUpdate(userId, { $push: { reposts: postId } });
		await Post.findByIdAndUpdate(postId, { $inc: { repostCount: 1 } });

		// Create notification for the original post author
		await createRepostNotification(postId, userId);

		res.status(200).json({ message: 'Post reposted' });
	} catch (error) {
		console.log('Error in repostPost function', error.message);
		res.status(500).json({ error: 'Internal Server Error' });
	}
};

export const getPostById = async (req, res, next) => {
	try {
		const { postId } = req.params;

		console.log(`Fetching post with ID: ${postId}`);

		// First try to find in posts
		let post = await Post.findById(postId)
			.populate({
				path: "user",
				select: "username fullName profileImg"
			})
			.populate({
				path: "comments",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			})
			.populate({
				path: "originalPost",
				populate: {
					path: "user",
					select: "username fullName profileImg"
				}
			})
			.lean();

		// If not found in posts, try in comments
		if (!post) {
			console.log(`Post not found, checking comments for ID: ${postId}`);
			const comment = await Comment.findById(postId)
				.populate("user", "username fullName profileImg")
				.populate("post", "_id")
				.lean();

			if (comment) {
				console.log(`Found comment with ID: ${postId}`);
				// Convert comment to post-like structure for consistent handling
				post = {
					...comment,
					isComment: true,
					comments: comment.replies || [],
					likes: comment.likes || [],
					reposts: comment.reposts || [],
					viewCount: comment.viewCount || 0
				};
			}
		}

		if (!post) {
			console.log(`Post/comment not found with ID: ${postId}`);
			return res.status(404).json({ message: "Post not found" });
		}

		// Add isRepost flag if it's a post
		if (!post.isComment) {
			post.isRepost = post.originalPost ? true : false;
		}

		console.log(`Successfully fetched post/comment: ${postId}`);
		res.status(200).json(post);
	} catch (error) {
		console.error(`Error fetching post/comment ${req.params.postId}:`, error);
		if (error.name === 'CastError') {
			return res.status(400).json({ message: "Invalid ID format" });
		}
		next(error);
	}
};

export const incrementViewCount = async (req, res, next) => {
	try {
		const { postId } = req.params;

		const post = await Post.findById(postId);
		if (!post) {
			return next(errorHandler(404, "Post not found"));
		}

		// Increment view count
		post.viewCount = (post.viewCount || 0) + 1;
		await post.save();

		res.status(200).json({ 
			message: "View count updated successfully",
			viewCount: post.viewCount 
		});
	} catch (error) {
		next(error);
	}
};

export const getUserPostCount = async (req, res) => {
	try {
		const { userId } = req.params;

		const postCount = await Post.countDocuments({ user: userId });

		res.status(200).json({ postCount });
	} catch (error) {
		console.error("Error in getUserPostCount controller:", error);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const getPostByNumber = async (req, res, next) => {
	try {
		const { postNumber } = req.params;

		// First try to find a post with this number
		let post = await Post.findOne({ postNumber })
			.populate('user', 'username fullName profileImg')
			.lean();

		// If not found, try to find a comment with this number
		if (!post) {
			const comment = await Comment.findOne({ postNumber })
				.populate('user', 'username fullName profileImg')
				.populate('post', '_id')
				.lean();

			if (comment) {
				return res.status(200).json({
					...comment,
					isComment: true
				});
			}
		}

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		res.status(200).json(post);
	} catch (error) {
		next(error);
	}
};

export const getPostQuotes = async (req, res, next) => {
	try {
		const { postId } = req.params;

		// First get the post number for this post
		const post = await Post.findById(postId).select('postNumber');
		if (!post) {
			// Try finding in comments
			const comment = await Comment.findById(postId).select('postNumber');
			if (!comment) {
				return res.status(404).json({ error: "Post not found" });
			}
			post = comment;
		}

		// Find all comments that reference this post number
		const quotes = await Comment.find({
			text: { $regex: `>>${post.postNumber.toString().padStart(10, '0')}` }
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
// Get posts from followers
export const getFollowersPosts = async (req, res) => {
	try {
		const userId = req.user._id;
		
		// Find the current user with populated followers
		const user = await User.findById(userId);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}
		
		// Get all posts from followers
		const posts = await Post.find({ user: { $in: user.followers } })
			.sort({ createdAt: -1 })
			.populate("user", "username fullName profileImg")
			.populate({
				path: "comments",
				populate: {
					path: "user",
					select: "username profileImg fullName",
				},
			});
			
		res.status(200).json(posts);
	} catch (error) {
		console.error("Error in getFollowersPosts controller:", error);
		res.status(500).json({ error: error.message });
	}
};
