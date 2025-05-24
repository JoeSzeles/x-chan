import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	commentOnPost,
	createPost,
	deletePost,
	getAllPosts,
	getFollowingPosts,
	getLikedPosts,
	getUserPosts,
	likeUnlikePost,
	repostPost,
	getPostById,
	incrementViewCount,
	likeComment,
	deleteComment,
	getUserPostCount,
	getPostByNumber,
	getPostQuotes
} from "../controllers/post.controller.js";

const router = express.Router();

router.get("/all", protectRoute, getAllPosts);
router.get("/following", protectRoute, getFollowingPosts);
router.get("/followers", protectRoute, getFollowersPosts);
router.get("/likes/:id", protectRoute, getLikedPosts);
router.get("/user/:username", protectRoute, getUserPosts);
router.get("/:postId", getPostById);
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
router.get("/number/:postNumber", getPostByNumber);
router.get("/:postId/quotes", getPostQuotes);

export default router;
