import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import { getNews } from "../controllers/news.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNews);

export default router; 