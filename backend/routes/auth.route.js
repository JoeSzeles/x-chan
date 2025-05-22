import { signup, login, logout, getMe } from "../controllers/auth.controller.js";
import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post('/signup', signup);

// Enhanced login route with additional logging
router.post('/login', async (req, res) => {
  console.log('[Auth Route] Login attempt for user:', req.body.username);
  try {
    await login(req, res);
    console.log('[Auth Route] Login successful for:', req.body.username);
  } catch (error) {
    console.error('[Auth Route] Login error:', error);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

router.post('/logout', logout);
router.get('/me', verifyToken, getMe);

// Add a route to verify token/session
router.get('/verify', verifyToken, (req, res) => {
  res.status(200).json({ 
    valid: true, 
    user: {
      _id: req.user._id,
      username: req.user.username
    }
  });
});

export default router;