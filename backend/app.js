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
import messageRoutes from "./routes/messages.js";

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

// Get current file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Register routes
console.log('Setting up routes...');
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

// Debug message routes registration
console.log('=== MESSAGES ROUTES DEBUG START ===');
console.log('messageRoutes type:', typeof messageRoutes);
console.log('messageRoutes default:', messageRoutes.default);
console.log('messageRoutes keys:', Object.keys(messageRoutes || {}));
console.log('messageRoutes constructor:', messageRoutes?.constructor?.name);
console.log('messageRoutes stack length:', messageRoutes?.stack?.length);

// Check if messageRoutes is actually an Express router
if (messageRoutes && typeof messageRoutes === 'function' && messageRoutes.stack) {
    console.log('✓ messageRoutes appears to be a valid Express router');
    console.log('Routes in stack:', messageRoutes.stack.map(layer => ({
        path: layer.route?.path,
        methods: layer.route ? Object.keys(layer.route.methods) : 'middleware'
    })));
} else {
    console.log('✗ messageRoutes is NOT a valid Express router');
    console.log('Attempting to use messageRoutes.default...');
    if (messageRoutes?.default && typeof messageRoutes.default === 'function') {
        console.log('Using messageRoutes.default instead');
        app.use("/api/messages", messageRoutes.default);
    } else {
        console.error('CRITICAL: No valid router found for messages!');
    }
}

if (messageRoutes && typeof messageRoutes === 'function' && messageRoutes.stack) {
    app.use("/api/messages", messageRoutes);
    console.log('✓ Messages routes registered at /api/messages');
} else {
    console.error('✗ Failed to register messages routes');
}
console.log('=== MESSAGES ROUTES DEBUG END ===');

// Test endpoint to verify server is running
app.get('/api/test', (req, res) => {
    res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// List all registered routes for debugging
app.get('/api/debug/routes', (req, res) => {
    const routes = [];
    const middlewares = [];
    
    app._router.stack.forEach((middleware, index) => {
        if (middleware.route) {
            routes.push({
                type: 'route',
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods),
                index
            });
        } else if (middleware.name === 'router' && middleware.regexp) {
            const baseUrl = middleware.regexp.source
                .replace(/^\^\\?/, '')
                .replace(/\$.*/, '')
                .replace(/\\\//g, '/');
            
            middlewares.push({
                type: 'middleware',
                baseUrl: baseUrl || 'unknown',
                index,
                hasStack: !!middleware.handle?.stack,
                stackLength: middleware.handle?.stack?.length || 0
            });
            
            if (middleware.handle?.stack) {
                middleware.handle.stack.forEach((handler, handlerIndex) => {
                    if (handler.route) {
                        routes.push({
                            type: 'nested_route',
                            baseUrl: baseUrl || 'unknown',
                            path: handler.route.path,
                            fullPath: (baseUrl || '') + handler.route.path,
                            methods: Object.keys(handler.route.methods),
                            middlewareIndex: index,
                            handlerIndex
                        });
                    }
                });
            }
        }
    });
    
    res.json({ 
        routes, 
        middlewares, 
        timestamp: new Date().toISOString(),
        totalMiddlewares: app._router.stack.length
    });
});

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