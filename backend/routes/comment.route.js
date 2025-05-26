import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	getComments,
	createComment,
	deleteComment,
	likeComment,
	trackView,
	bookmarkComment,
	repostComment,
	rateComment,
	getCommentQuotes,
	getCommentById
} from "../controllers/comment.controller.js";

const router = express.Router();

// Get comments for a post
router.get("/:postId", getComments);

// Create a comment
router.post("/:postId", authenticateToken, createComment);
router.post("/create", protectRoute, createComment);

// Delete a comment
router.delete("/:commentId", authenticateToken, deleteComment);
router.delete("/:id", protectRoute, deleteComment);

// Like/unlike a comment
router.post("/like/:commentId", authenticateToken, likeComment);
router.post("/like/:id", protectRoute, likeComment);

// Bookmark/unbookmark a comment
router.post("/bookmark/:commentId", authenticateToken, bookmarkComment);

// Repost/unrepost a comment
router.post("/repost/:commentId", authenticateToken, repostComment);
router.post("/repost/:id", protectRoute, repostComment);

// Rate a comment
router.post("/rate/:commentId", authenticateToken, rateComment);

// Track comment view
router.post("/:commentId/view", trackView);

// Get comment quotes
router.get("/:commentId/quotes", getCommentQuotes);

// Get comment by ID
router.get("/:id", getCommentById);

export default router;
