import express from "express";
import { getMe, login, logout, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

router.get("/me", protectRoute, getMe);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

router.get("/profile", protectRoute, async (req, res) => {
  try {
    // Ensure consistent response format
    res.json({ 
      success: true,
      data: req.user 
    });
  } catch (error) {
    console.error("Profile fetch error:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Failed to retrieve profile" 
    });
  }
});

export default router;