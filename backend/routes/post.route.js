import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	createPost,
	deletePost,
	commentOnPost,
	likeUnlikePost,
	getAllPosts,
	getLikedPosts,
	getFollowingPosts,
	getUserPosts,
	bookmarkPost,
	getBookmarkedPosts,
	removeBookmark,
	repostPost,
	getPostById,
	getPostByNumber,
	updatePostVisibility,
	getPostsByBoard,
	sharePost,
	reportPost,
	getPostStats,
	getQuoteReferences
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/bookmarked", protectRoute, getBookmarkedPosts);
router.get("/board/:boardName", protectRoute, getPostsByBoard);
router.get("/stats/:id", protectRoute, getPostStats);
router.get("/quote-references/:id", protectRoute, getQuoteReferences);
router.get("/number/:postNumber", protectRoute, getPostByNumber);
router.get("/:id", protectRoute, getPostById);
router.post("/create", protectRoute, createPost);
router.post("/like/:id", protectRoute, likeUnlikePost);
router.post("/repost/:id", protectRoute, repostPost);
router.post("/comment/:id", protectRoute, commentOnPost);
router.post("/:postId/view", incrementViewCount);
router.delete("/:id", protectRoute, deletePost);
router.put("/:id/like", protectRoute, likeUnlikePost);
router.put("/:id/repost", protectRoute, repostPost);
router.put("/:postId/comment/:commentId/like", protectRoute, likeComment);
router.delete("/:postId/comment/:commentId", protectRoute, deleteComment);
router.get("/user/:userId/count", protectRoute, getUserPostCount);
router.get("/:postId/quotes", getPostQuotes);

export default router;