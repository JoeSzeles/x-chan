import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import postRoutes from './routes/post.route.js';
import proxyRoutes from './routes/proxy.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from "path";
import cookieParser from "cookie-parser";
import fs from 'fs';
import { v2 as cloudinary } from "cloudinary";
import { errorHandler } from "./utils/error.js";
import searchRoutes from './routes/searchRoutes.js';
import twitterRoutes from './routes/twitter.js';
import notificationRoutes from "./routes/notification.route.js";
import bookmarkRoutes from "./routes/bookmark.route.js";
import ratingRoutes from "./routes/rating.routes.js";
import commentRoutes from "./routes/comment.route.js";
import grokRoutes from './routes/grok.js';
import newsBotRoutes from './routes/newsBot.js';
import boardRoutes from './routes/board.route.js';
import uploadRoutes from './routes/upload.route.js';
import leechRoutes from './routes/leech.js';
import serviceRoutes from './routes/service.route.js';
import liveBoardRoutes from './routes/liveBoard.js';

import connectMongoDB from "./db/connectMongoDB.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables first
dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Verify environment variables
if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not defined in .env file");
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;
const FRONTEND_PORT = process.env.FRONTEND_PORT || 3000;
const HOST = '0.0.0.0';

// Enable CORS
const allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5000',
    'https://tradehub.ap.ngrok.io',
    'wss://tradehub.ap.ngrok.io',
    'https://googleads.g.doubleclick.net',
    'https://i.4cdn.org'
];

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://*.worf.replit.dev https://events.launchdarkly.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.launchdarkly.com https://*.stripe.network https://*.replit.dev https://replit.com https://m.stripe.network https://*.worf.replit.dev https://events.launchdarkly.com https://beacon.replit.com https://static.cloudflareinsights.com https://cdn.segment.com; style-src 'self' 'unsafe-inline' 'unsafe-hashes' https://*.replit.dev https://*.stripe.network data: blob:; img-src 'self' data: blob: https: *; connect-src 'self' ws: wss: http: https: wss://*.replit.dev wss://*.worf.replit.dev https://*.launchdarkly.com https://*.stripe.network https://replit.com https://events.launchdarkly.com https://beacon.replit.com https://m.stripe.network https://api.segment.io ws://0.0.0.0:* http://0.0.0.0:*; frame-src 'self' https://*.replit.dev https://*.worf.replit.dev https://replit.com https://*.stripe.network");
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    next();
});

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'ngrok-skip-browser-warning', 'Origin', 'Accept', 'X-Requested-With', 'Cross-Origin-Resource-Policy', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Origin'],
    exposedHeaders: ['Set-Cookie', 'Access-Control-Allow-Origin', 'Cross-Origin-Resource-Policy', 'Access-Control-Allow-Headers'],
    credentials: true
}));

// Update body-parser limits
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files with proper headers
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    next();
}, express.static(path.join(__dirname, 'public', 'uploads')));

app.use('/public', express.static(path.join(__dirname, 'public')));

// Add a route to check if an image exists
app.get('/api/check-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'public', 'uploads', filename);
    console.log('Checking image path:', filePath);
    if (fs.existsSync(filePath)) {
        res.json({ exists: true, path: filePath });
    } else {
        res.json({ exists: false, path: filePath });
    }
});

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

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    if (err.message.includes('CORS')) {
        return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
});

if (process.env.NODE_ENV === "production") {
	app.use(express.static(path.join(__dirname, "/frontend/dist")));

	app.get("*", (req, res) => {
		res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
	});
}

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: function(origin, callback) {
            if (!origin) return callback(null, true);

            if (allowedOrigins.indexOf(origin) === -1) {
                const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
                return callback(new Error(msg), false);
            }
            return callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'ngrok-skip-browser-warning'],
        exposedHeaders: ['Set-Cookie']
    },
    transports: ['polling'],
    pingTimeout: 10000,
    pingInterval: 5000,
    connectTimeout: 10000,
    maxHttpBufferSize: 1e8,
    path: '/socket.io/',
    allowEIO3: true,
    cookie: {
        name: 'io',
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production'
    }
});

// Socket.IO error handling
io.on('error', (error) => {
    console.error('Socket.IO server error:', error);
});

// Socket.IO connection handling with better error handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
    });

    // Join user's notification room
    socket.on('joinNotifications', (userId) => {
        if (!userId) {
            console.error('No userId provided for joinNotifications');
            return;
        }
        try {
            socket.join(`notifications_${userId}`);
            console.log(`Client ${socket.id} joined notifications room for user: ${userId}`);
        } catch (error) {
            console.error('Error joining notifications room:', error);
            socket.emit('error', { message: 'Failed to join notifications room' });
        }
    });

    // Leave user's notification room
    socket.on('leaveNotifications', (userId) => {
        if (!userId) {
            console.error('No userId provided for leaveNotifications');
            return;
        }
        try {
            socket.leave(`notifications_${userId}`);
            console.log(`Client ${socket.id} left notifications room for user: ${userId}`);
        } catch (error) {
            console.error('Error leaving notifications room:', error);
            socket.emit('error', { message: 'Failed to leave notifications room' });
        }
    });

    // Add heartbeat mechanism
    socket.on('ping', () => {
        socket.emit('pong');
    });
});

// Add global error handler for Socket.IO
io.engine.on('connection_error', (err) => {
    console.error('Socket.IO connection error:', err);
});

// Connect to MongoDB before starting the server
connectMongoDB().then(() => {
    httpServer.listen(PORT, HOST, () => {
        console.log(`Server is running on http://${HOST}:${PORT}`);
    });
}).catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

export { app, io };