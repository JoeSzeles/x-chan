import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { bookmarkPost, getBookmarkedPosts } from "../controllers/bookmark.controller.js";

const router = express.Router();

// Bookmark/unbookmark a post
router.post("/:postId", protectRoute, bookmarkPost);

// Get all bookmarked posts for the authenticated user
router.get("/", protectRoute, getBookmarkedPosts);

export default router; 