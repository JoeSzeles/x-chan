import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	createComment,
	deleteComment,
	getAllComments,
	getCommentById,
	likeUnlikeComment,
	replyToComment,
	getCommentsByPost,
	incrementViewCount,
	getUserCommentCount,
	getCommentByNumber,
	getCommentQuotes,
	repostComment
} from "../controllers/comment.controller.js";

const router = express.Router();

router.post("/like/:id", protectRoute, likeUnlikeComment);
router.post("/reply/:id", protectRoute, replyToComment);
router.post("/repost/:id", protectRoute, repostComment);
router.post("/:commentId/view", incrementViewCount);
router.delete("/:id", protectRoute, deleteComment);
router.get("/user/:userId/count", protectRoute, getUserCommentCount);
router.get("/number/:postNumber", getCommentByNumber);
router.get("/:commentId/quotes", getCommentQuotes);

export default router;