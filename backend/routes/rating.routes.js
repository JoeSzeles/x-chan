import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { ratePost, getRating } from "../controllers/rating.controller.js";

const router = express.Router();

// Rate a post
router.post("/:postId", authenticateToken, ratePost);

// Get rating for a post
router.get("/:postId", getRating);

export default router; 