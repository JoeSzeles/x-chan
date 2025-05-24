import express from "express";
import { getMe, login, logout, signup } from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/protectRoute.js";

const router = express.Router();

// Debug middleware to log auth requests
router.use((req, res, next) => {
  console.log(`[Auth Route] ${req.method} ${req.url}`);
  next();
});

router.get("/me", protectRoute, getMe);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

export default router;
