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
import coverPhotoRoutes from './routes/cover-photo.route.js'; // Import cover photo route

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Add CSP headers for deployment
app.use((req, res, next) => {
    // Set Content Security Policy headers
    res.setHeader(
        'Content-Security-Policy',
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; " +
        "style-src * 'unsafe-inline' data: blob:; " + 
        "img-src * data: blob:; " + 
        "font-src * data:; " +
        "connect-src * ws: wss:; " +
        "frame-src *; " +
        "media-src *; " +
        "object-src 'none'; " +
        "worker-src * blob:;"
    );
    next();
});

const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));

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

// Serve static frontend files
const frontendDistPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
    console.log('Serving frontend from', frontendDistPath);
    app.use(express.static(frontendDistPath));
}

// Import index routes at the top level - dynamic import
// This needs to be after the other routes but before starting the server
app.use(async (req, res, next) => {
    // Skip API and asset routes
    if (req.url.startsWith('/api') || 
        req.url.startsWith('/uploads') || 
        req.url.startsWith('/public')) {
        return next();
    }
    
    try {
        // Import the router dynamically
        const { default: indexRoutes } = await import('./routes/index.js');
        // Forward the request to the index routes
        return indexRoutes(req, res, next);
    } catch (err) {
        console.error('Error importing index routes:', err);
        return res.status(500).send('Server error loading frontend routes');
    }
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
    pingTimeout: 30000,
    pingInterval: 10000,
    connectTimeout: 30000,
    upgradeTimeout: 30000,
    forcePolling: false,
    allowUpgrades: true
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