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

app.use(cors());
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

const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        credentials: true,
        allowedHeaders: ["*"]
    },
    path: '/socket.io/',
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000,
    maxHttpBufferSize: 1e8,
    connectTimeout: 45000,
    allowEIO3: true,
    forceNew: true,
    upgrade: true,
    cookie: false
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
        console.log('[Socket.io] Packet:', {
            type: packet.type,
            data: packet.data,
            timestamp: new Date().toISOString()
        });
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