
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

dotenv.config();

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan('dev'));

app.use(cors({
    origin: true,
    credentials: true
}));

export default app;
