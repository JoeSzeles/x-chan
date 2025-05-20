import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const userCache = new Map();

export const verifyToken = async (req, res, next) => {
    try {
        console.log('Headers:', req.headers);
        console.log('Cookies:', req.cookies);

        const token = req.cookies.jwt;
        if (!token) {
            console.log('No JWT token found in cookies');
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }

        console.log('JWT token:', token);
        console.log("JWT token:", token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded token:", decoded);
        if (!decoded) {
            console.log('Token verification failed');
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }

        // Check cache first
        if (userCache.has(decoded.userId)) {
            req.user = userCache.get(decoded.userId);
            return next();
        }

        const user = await User.findById(decoded.userId).select("-password");
        console.log('Found user:', user ? 'Yes' : 'No');

        if (!user) {
            console.log('User not found for ID:', decoded.userId);
            return res.status(404).json({ error: "User not found" });
        }

        console.log('User authenticated successfully');

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