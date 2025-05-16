import express from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    followUnfollowUser,
    getSuggestedUsers,
    updateUser,
    getUserProfile,
    updateSettings
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/profile/:username", getUserProfile);
router.get("/suggested", protectRoute, getSuggestedUsers);
router.post("/follow/:id", protectRoute, followUnfollowUser);
router.put("/update/:id", protectRoute, updateUser);
router.put("/settings", protectRoute, updateSettings);

export default router; 