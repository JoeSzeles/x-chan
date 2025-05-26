import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { repostPost } from "../controllers/post.controller.js";

const router = express.Router();

router.post("/repost/:id", protectRoute, repostPost);

export default router;