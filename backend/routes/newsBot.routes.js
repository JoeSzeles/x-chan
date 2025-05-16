import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    createBot,
    updateBot,
    deleteBot,
    getBots,
    getBot,
    updateBotArticles,
    getBotArticles,
    postToFeed,
    postArticle
} from "../controllers/newsBot.controller.js";

const router = express.Router();

router.post("/", protectRoute, createBot);
router.put("/:botId", protectRoute, updateBot);
router.delete("/:botId", protectRoute, deleteBot);
router.get("/", protectRoute, getBots);
router.get("/:botId", protectRoute, getBot);
router.post("/:botId/update", protectRoute, updateBotArticles);
router.get("/:botId/articles", protectRoute, getBotArticles);
router.post("/:botId/post-to-feed", protectRoute, postToFeed);
router.post("/:botId/post-article", protectRoute, postArticle);

export default router; 