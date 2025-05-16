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
			
			return res.status(200).json({ 
				message: "Post unbookmarked successfully",
				isBookmarked: false,
				bookmarkedBy: unbookmarkedPost.bookmarkedBy || []
			});
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
			
			return res.status(200).json({ 
				message: "Post bookmarked successfully",
				isBookmarked: true,
				bookmarkedBy: bookmarkedPost.bookmarkedBy || []
			});
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