import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const userCache = new Map();

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }

        // Check cache first
        if (userCache.has(decoded.userId)) {
            req.user = userCache.get(decoded.userId);
            return next();
        }

        const user = await User.findById(decoded.userId).select("-password");
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Cache user for 5 minutes
        userCache.set(decoded.userId, user);
        setTimeout(() => userCache.delete(decoded.userId), 5 * 60 * 1000);

        req.user = user;
        next();
    } catch (error) {
        console.log("Error in verifyToken middleware: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
}; 