import Post from "../models/post.model.js";
import User from "../models/user.model.js";
import { errorHandler } from "../utils/error.js";

export const bookmarkPost = async (req, res, next) => {
	try {
		const { postId } = req.params;
		const userId = req.user._id;

		const post = await Post.findById(postId);
		if (!post) {
			return next(errorHandler(404, "Post not found"));
		}

		const user = await User.findById(userId);
		if (!user) {
			return next(errorHandler(404, "User not found"));
		}

		const isBookmarked = user.bookmarks.includes(postId);

		if (isBookmarked) {
			// Remove bookmark
			await User.findByIdAndUpdate(userId, {
				$pull: { bookmarks: postId }
			});
			await Post.findByIdAndUpdate(postId, {
				$pull: { bookmarkedBy: userId }
			});

			// Get updated post with populated bookmarkedBy
			const unbookmarkedPost = await Post.findById(postId)
				.populate('bookmarkedBy', 'username fullName profileImg');

			return res.status(200).json(unbookmarkedPost.bookmarkedBy || []);
		} else {
			// Add bookmark
			await User.findByIdAndUpdate(userId, {
				$push: { bookmarks: postId }
			});
			await Post.findByIdAndUpdate(postId, {
				$push: { bookmarkedBy: userId }
			});

			// Get updated post with populated bookmarkedBy
			const bookmarkedPost = await Post.findById(postId)
				.populate('bookmarkedBy', 'username fullName profileImg');

			// Create bookmark notification
			try {
				const currentPost = await Post.findById(postId);
				if (currentPost.user.toString() !== userId.toString()) {
					const { createBookmarkNotification } = await import('./notification.controller.js');
					await createBookmarkNotification(postId, userId);
					console.log(`Bookmark notification created from ${userId} to ${currentPost.user}`);
				}
			} catch (notifError) {
				console.error("Error creating bookmark notification:", notifError);
				// Don't fail the bookmark if notification creation fails
			}

			return res.status(200).json(bookmarkedPost.bookmarkedBy || []);
		}
	} catch (error) {
		next(error);
	}
};

export const getBookmarkedPosts = async (req, res, next) => {
	try {
		const userId = req.user._id;
		const user = await User.findById(userId).populate({
			path: 'bookmarks',
			populate: {
				path: 'user',
				select: 'username fullName profileImg'
			}
		});

		if (!user) {
			return next(errorHandler(404, "User not found"));
		}

		res.status(200).json(user.bookmarks);
	} catch (error) {
		next(error);
	}
};

export const createBookmark = async (req, res) => {
	try {
		const userId = req.user._id;
		const { postId } = req.body;

		// Check if the post exists
		const post = await Post.findById(postId);

		if (!post) {
			return res.status(404).json({ error: "Post not found" });
		}

		// Check if the bookmark already exists
		const user = await User.findById(userId);
		if (user.bookmarks.includes(postId)) {
			return res.status(400).json({ error: "Post already bookmarked" });
		}

		// Add to bookmarks
		await User.findByIdAndUpdate(userId, {
			$push: { bookmarks: postId }
		});

		// Create notification for the post author
		// Assuming createBookmarkNotification is defined elsewhere and handles the notification creation.
		// You need to import it or define it in this file.
		// For example:
		// import { createBookmarkNotification } from './notification.controller.js';
		// await createBookmarkNotification(postId, userId);

		res.status(201).json({ message: "Post bookmarked successfully" });
	} catch (error) {
		console.log("Error in createBookmark function", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};