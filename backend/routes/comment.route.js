import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
	getComments,
	createComment,
	deleteComment,
	likeComment,
	trackView,
	bookmarkComment,
	repostComment,
	rateComment,
	getCommentQuotes
} from "../controllers/comment.controller.js";

const router = express.Router();

// Get comments for a post
router.get("/:postId", getComments);

// Create a comment
router.post("/:postId", authenticateToken, createComment);

// Delete a comment
router.delete("/:commentId", authenticateToken, deleteComment);

// Like/unlike a comment
router.post("/like/:commentId", authenticateToken, likeComment);

// Bookmark/unbookmark a comment
router.post("/bookmark/:commentId", authenticateToken, bookmarkComment);

// Repost/unrepost a comment
router.post("/repost/:commentId", authenticateToken, repostComment);

// Rate a comment
router.post("/rate/:commentId", authenticateToken, rateComment);

// Track comment view
router.post("/:commentId/view", trackView);

// Get comment quotes
router.get("/:commentId/quotes", getCommentQuotes);

export default router; 