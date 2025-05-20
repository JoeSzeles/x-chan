
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();
const PORT = 5000;
const HOST = '0.0.0.0';

app.use(cors({
    origin: ['http://localhost:3000', 'http://0.0.0.0:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200
}));

// Add security headers
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https: http: data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https: http: ws: wss:;");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
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

if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.join(__dirname, "/frontend/dist")));
    app.get("*", (req, res) => {
        res.sendFile(path.resolve(__dirname, "frontend", "dist", "index.html"));
    });
}

const httpServer = createServer(app);
const io = new Server(httpServer);

io.on('connection', (socket) => {
    socket.on('error', (error) => {
        console.error('Socket error:', error);
    });

    socket.on('disconnect', (reason) => {
        console.log('Client disconnected:', socket.id, 'Reason:', reason);
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
