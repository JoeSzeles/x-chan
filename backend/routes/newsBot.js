import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    createBot,
    getBots,
    getBotById,
    updateBot,
    deleteBot,
    getBotPosts,
    getUserBots,
    getBotArticles,
    updateBotArticles,
    toggleBotStatus,
    clearBotArticles
} from "../controllers/newsBot.controller.js";

const router = express.Router();

// Bot management routes - specific routes first
router.post("/", protectRoute, createBot);
router.get("/", protectRoute, getBots);
router.get("/user", protectRoute, getUserBots);
router.get("/:botId", protectRoute, getBotById);
router.put("/:botId", protectRoute, updateBot);
router.delete("/:botId", protectRoute, deleteBot);
router.post("/:botId/toggle", protectRoute, toggleBotStatus);

// Article management routes
router.get("/:botId/articles", protectRoute, getBotArticles);
router.post("/:botId/update", protectRoute, updateBotArticles);
router.post("/:botId/clear", protectRoute, clearBotArticles);

export default router; 