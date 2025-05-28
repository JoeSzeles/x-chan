import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import { v2 as cloudinary } from "cloudinary";

// Set global flags for debugging and mock data
global.USE_MOCK_DATA = false;
console.log('Mock data DISABLED - system will attempt real scraping');

// Get the directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import routes
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import postRoutes from './routes/post.route.js';
import proxyRoutes from './routes/proxy.js';
import searchRoutes from './routes/searchRoutes.js';
import twitterRoutes from './routes/twitter.js';
import notificationRoutes from "./routes/notification.route.js";
import bookmarkRoutes from './routes/bookmark.route.js';
import ratingRoutes from './routes/rating.routes.js';
import commentRoutes from './routes/comment.route.js';
import grokRoutes from './routes/grok.js';
import newsBotRoutes from './routes/newsBot.js';
import boardRoutes from './routes/board.route.js';
import uploadRoutes from './routes/upload.route.js';
import leechRoutes from './routes/leech.js';
import serviceRoutes from './routes/service.route.js';
import liveBoardRoutes from './routes/liveBoard.js';
import connectMongoDB from "./db/connectMongoDB.js";
import coverPhotoRoutes from './routes/cover-photo.route.js';
import messagesRoutes from './routes/messages.js'; // Import cover photo route

dotenv.config();

// Configure Cloudinary with proper error handling
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.warn('Cloudinary configuration missing. Image uploads may not work correctly.');
    console.warn('Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables.');
} else {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
    console.log('Cloudinary configured successfully');
}

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Serve frontend files in production
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
console.log('Serving frontend from', frontendBuildPath);
// Make sure the directory exists before serving
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
} else {
    console.warn(`Warning: Frontend build path not found at ${frontendBuildPath}`);
    console.warn('Make sure to build the frontend with "cd frontend && npm run build"');
}

// Configure CORS for Express
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if(!origin) return callback(null, true);
        // Otherwise allow any origin
        return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Global error handler for unhandled exceptions
app.use((err, req, res, next) => {
    console.error('Unhandled exception:', err);
    res.status(500).json({ 
        error: 'Server error', 
        message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
    });
});

// Handle uncaught exceptions to prevent server crashes
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    // Keep the server running despite errors
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Keep the server running despite promise rejections
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/public/assets')));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/posts/rate", ratingRoutes);
app.use('/api/search', searchRoutes);
app.use("/api/comments", commentRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/grok', grokRoutes);
app.use('/api/proxy', proxyRoutes);
app.use('/api/newsbot', newsBotRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/upload', uploadRoutes);
app.use("/api/leech", leechRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/liveboard', liveBoardRoutes);
app.use('/api/cover-photo', coverPhotoRoutes);
app.use('/api/messages', messagesRoutes);

// Catch-all route to serve the frontend for any non-API routes
app.get('*', (req, res) => {
    // Exclude API routes from the catch-all
    if (!req.path.startsWith('/api') && !req.path.startsWith('/socket.io')) {
        res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
    } else {
        res.status(404).json({ error: 'API endpoint not found' });
    }
});

const httpServer = createServer(app);

// Configure Socket.IO with proper CORS
const io = new Server(httpServer, {
    path: '/socket.io',
    cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["Content-Type", "Authorization"]
    },
    allowEIO3: true,
    transports: ['websocket', 'polling']
});

// Enable detailed debug logging
io.engine.on("initial_headers", (headers, req) => {
    console.log("Initial headers:", headers);
    console.log("Request URL:", req.url);
    console.log("Request method:", req.method);
    console.log("Request headers:", req.headers);
});

// Add detailed socket error logging
io.engine.on("connection_error", (err) => {
    console.error('[Socket.io] Connection error:', {
        type: err.req?.query?.transport,
        code: err.code,
        message: err.message,
        context: err.context,
        headers: err.req?.headers,
        method: err.req?.method,
        url: err.req?.url,
        timestamp: new Date().toISOString(),
        stack: err.stack
    });
});

io.on("connect_error", (err) => {
    console.error('[Socket.io] Connect error:', {
        message: err.message,
        type: err.type,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
});

io.on("error", (err) => {
    console.error('[Socket.io] General error:', {
        message: err.message,
        type: err.type,
        stack: err.stack,
        timestamp: new Date().toISOString()
    });
});

io.on('connection', socket => {
    console.log('[Socket.io] Client connected:', {
        id: socket.id,
        transport: socket.conn.transport.name,
        headers: socket.handshake.headers,
        timestamp: new Date().toISOString()
    });

    socket.on('error', (error) => {
        console.error('[Socket.io] Socket error:', {
            id: socket.id,
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', (reason) => {
        console.log('[Socket.io] Client disconnected:', {
            id: socket.id,
            reason,
            transport: socket.conn?.transport?.name,
            timestamp: new Date().toISOString()
        });
    });

    socket.conn.on('packet', (packet) => {
        if (packet.type !== 2) { // Skip logging ping packets (type 2) to reduce noise
            console.log('[Socket.io] Packet:', {
                type: packet.type,
                data: packet.data,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Join notification room specific to a user
    socket.on('joinNotifications', (userId) => {
        if (!userId) {
            console.log('[Socket.io] Invalid userId for notifications');
            return;
        }
        const roomName = `notifications_${userId}`;
        socket.join(roomName);
        console.log(`[Socket.io] User ${userId} joined notification room ${roomName}`);
    });

    // Leave notification room
    socket.on('leaveNotifications', (userId) => {
        if (!userId) return;
        const roomName = `notifications_${userId}`;
        socket.leave(roomName);
        console.log(`[Socket.io] User ${userId} left notification room ${roomName}`);
    });

    socket.on('joinBotRoom', (botId) => {
        console.log('[Socket.io] Client joined bot room:', {
            socketId: socket.id,
            botId
        });
        socket.join(`bot_${botId}`);
    });

    // Socket.IO connection handling
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // Join conversation room
        socket.on('join_conversation', (conversationId) => {
            socket.join(conversationId);
            console.log(`User ${socket.id} joined conversation ${conversationId}`);
        });

        // Leave conversation room
        socket.on('leave_conversation', (conversationId) => {
            socket.leave(conversationId);
            console.log(`User ${socket.id} left conversation ${conversationId}`);
        });

        // Handle new message - improved broadcasting
        socket.on('new_message', (message) => {
            // Broadcast to all users in the conversation including sender
            io.to(message.conversationId).emit('new_message', message);
            console.log(`Broadcasting message to conversation ${message.conversationId}`);
        });

        // Handle send_message event
        socket.on('send_message', (data) => {
            const { conversationId, message } = data;
            // Broadcast to all users in the conversation including sender
            io.to(conversationId).emit('new_message', message);
            console.log(`Broadcasting message to conversation ${conversationId}`);
        });

        // Handle typing indicators
        socket.on('typing', (data) => {
            const { conversationId, isTyping } = data;
            socket.to(conversationId).emit('user_typing', {
                userId: socket.userId,
                conversationId,
                isTyping
            });
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });
});

connectMongoDB().then(() => {
    httpServer.listen(PORT, HOST, () => {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

export { app, io };