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
import coverPhotoRoutes from './routes/cover-photo.route.js'; // Import cover photo route

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0';

// Serve frontend files in production
const frontendBuildPath = path.join(__dirname, '../frontend/dist');
const frontendPublicPath = path.join(__dirname, '../frontend/public');
console.log('Serving frontend from', frontendBuildPath);
console.log('Serving public assets from', frontendPublicPath);

// Make sure the directories exist before serving
if (fs.existsSync(frontendBuildPath)) {
    app.use(express.static(frontendBuildPath));
    console.log('Static files from build directory available at root path');
} else {
    console.warn(`Warning: Frontend build path not found at ${frontendBuildPath}`);
    console.warn('Make sure to build the frontend with "cd frontend && npm run build"');
}

// Serve files from frontend/public directory even in development mode
if (fs.existsSync(frontendPublicPath)) {
    app.use(express.static(frontendPublicPath));
    console.log('Serving public assets from frontend/public directory');
}

// Also serve from src/components/images as fallback for development
const imagesPath = path.join(__dirname, '../frontend/src/components/images');
if (fs.existsSync(imagesPath)) {
    app.use('/images', express.static(imagesPath));
    console.log('Serving images from', imagesPath);
}

// Simple fallback for logo file with placeholder
app.get('/xchan_small.png', (req, res) => {
    const logoPath = path.join(frontendPublicPath, 'xchan_small.png');
    const placeholderPath = path.join(frontendPublicPath, 'avatar-placeholder.png');
    
    // Try to serve the logo first
    if (fs.existsSync(logoPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(logoPath);
    }
    
    // Fall back to placeholder if logo not found
    if (fs.existsSync(placeholderPath)) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.sendFile(placeholderPath);
    }
    
    res.status(404).send('Logo not found');
});

// Also make logo available at images path
app.use('/images/xchan_small.png', (req, res) => {
    const logoPath = path.join(frontendPublicPath, 'xchan_small.png');
    const placeholderPath = path.join(frontendPublicPath, 'avatar-placeholder.png');
    
    if (fs.existsSync(logoPath)) {
        res.sendFile(logoPath);
    } else if (fs.existsSync(placeholderPath)) {
        res.sendFile(placeholderPath);
    } else {
        res.status(404).send('Logo not found');
    }
});

// Also serve content from the components/images directory at the root
app.use('/images', express.static(path.join(__dirname, '../frontend/src/components/images')));

app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

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