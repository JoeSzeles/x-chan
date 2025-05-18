import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";
import path from "path";
import dotenv from "dotenv";
import mongoose from "mongoose";
import auth from "./middleware/auth.js";
import boardRoutes from "./routes/boards.js";
import morgan from "morgan";
import helmet from "helmet"; // Import helmet

// Import routes
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import postRoutes from "./routes/post.route.js";
import notificationRoutes from "./routes/notification.route.js";
import newsRoutes from "./routes/news.js";
import newsBotRoutes from "./routes/newsBot.js";
import proxyRoutes from "./routes/proxy.js";
import commentRoutes from "./routes/comment.route.js";
import leechRoutes from "./routes/leech.js";
import bookmarkRoutes from "./routes/bookmark.route.js";
import { errorHandler } from "./middleware/errorHandler.js";
import listRoutes from "./routes/listRoutes.js";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan('dev'));

// CORS configuration
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// CSP configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'", "https://*.replit.dev", "https://*.worf.replit.dev", "https://*.youtube.com", "https://*.twitter.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://*.launchdarkly.com", "https://*.stripe.network", "https://*.replit.dev", "https://replit.com", "https://*.worf.replit.dev", "https://events.launchdarkly.com", "https://beacon.replit.com", "https://*.youtube.com", "https://platform.twitter.com", "https://*.twimg.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "data:", "blob:", "https://platform.twitter.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "https://*.cloudinary.com", "https://*.ytimg.com", "https://*.twimg.com", "https://platform.twitter.com"],
      fontSrc: ["'self'", "data:", "https://platform.twitter.com"],
      connectSrc: ["'self'", "https://*.replit.dev", "wss://*.replit.dev", "wss://*.worf.replit.dev", "https://*.launchdarkly.com", "https://*.stripe.network", "https://events.launchdarkly.com", "https://*.cloudinary.com", "ws://*", "wss://*", "https://replit.com", "https://beacon.replit.com", "https://*.twitter.com"],
      frameSrc: ["'self'", "https://www.youtube.com", "https://youtube.com", "https://platform.twitter.com", "https://*.twitter.com"],
      mediaSrc: ["'self'", "https://www.youtube.com", "https://youtube.com"],
      childSrc: ["'self'", "blob:", "https://platform.twitter.com"],
      objectSrc: ["'none'"],
      formAction: ["'self'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Register routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/newsbot", newsBotRoutes);
app.use("/api/proxy", proxyRoutes);
app.use("/api/boards", boardRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/leech", leechRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/lists", listRoutes);

// Error handling middleware
app.use(errorHandler);

// Start bot update scheduler
try {
    const { startBotUpdateScheduler } = await import("./services/botUpdateScheduler.js");
    startBotUpdateScheduler();
} catch (error) {
    console.error("Failed to start bot update scheduler:", error);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});