import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
	deleteNotifications,
	getNotifications,
	markNotificationAsRead
} from "../controllers/notification.controller.js";

const router = express.Router();

router.get("/", protectRoute, getNotifications);
router.delete("/", protectRoute, deleteNotifications);
router.patch("/:notificationId/read", protectRoute, markNotificationAsRead);

export default router;
