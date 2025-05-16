import Post from "../models/post.model.js";
import { errorHandler } from "../utils/error.js";

export const ratePost = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const { rating } = req.body;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return next(errorHandler(404, "Post not found"));
        }

        // Check if user has already rated this post
        const existingRatingIndex = post.ratings.findIndex(r => r.user.toString() === userId);

        if (existingRatingIndex !== -1) {
            // Update existing rating
            post.ratings[existingRatingIndex].rating = rating;
            await post.save();

            return res.status(200).json({
                message: "Rating updated successfully",
                ratings: post.ratings,
                isUpdate: true
            });
        } else {
            // Add new rating
            post.ratings.push({ user: userId, rating });
            await post.save();

            return res.status(200).json({
                message: "Post rated successfully",
                ratings: post.ratings,
                isUpdate: false
            });
        }
    } catch (error) {
        next(error);
    }
}; 

export const getRating = async (req, res, next) => {
    try {
        const { postId } = req.params;
        const userId = req.user?._id;

        const post = await Post.findById(postId);
        if (!post) {
            return next(errorHandler(404, "Post not found"));
        }

        // Calculate average rating
        const averageRating = post.ratings.length > 0
            ? post.ratings.reduce((sum, r) => sum + r.rating, 0) / post.ratings.length
            : 0;

        // Get user's rating if authenticated
        const userRating = userId
            ? post.ratings.find(r => r.user.toString() === userId)?.rating
            : null;

        return res.status(200).json({
            ratings: post.ratings,
            averageRating: parseFloat(averageRating.toFixed(1)),
            userRating,
            totalRatings: post.ratings.length
        });
    } catch (error) {
        next(error);
    }
}; 