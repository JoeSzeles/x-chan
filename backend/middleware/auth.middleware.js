import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const userCache = new Map();

export const verifyToken = async (req, res, next) => {
    try {
        // Check cookies first
        let token = req.cookies.jwt;
        
        // If no cookie, check Authorization header as fallback
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            console.log('[Auth] No token found in cookies or headers');
            return res.status(401).json({ error: "Unauthorized - No Token Provided" });
        }

        console.log('[Auth] Token found:', token.substring(0, 20) + '...');
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded || !decoded.userId) {
                console.log('[Auth] Invalid token payload');
                return res.status(401).json({ error: "Unauthorized - Invalid Token" });
            }
            
            console.log('[Auth] Token decoded successfully for user:', decoded.userId);

            // Check cache first for performance
            if (userCache.has(decoded.userId)) {
                req.user = userCache.get(decoded.userId);
                console.log('[Auth] User retrieved from cache');
                return next();
            }

            // Fetch user from database
            const user = await User.findById(decoded.userId).select("-password");
            
            if (!user) {
                console.log('[Auth] User not found for ID:', decoded.userId);
                return res.status(404).json({ error: "User not found" });
            }

            console.log('[Auth] User authenticated successfully');

            // Cache user for 5 minutes
            userCache.set(decoded.userId, user);
            setTimeout(() => userCache.delete(decoded.userId), 5 * 60 * 1000);

            req.user = user;
            next();
        } catch (jwtError) {
            console.error('[Auth] JWT verification failed:', jwtError.message);
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }
    } catch (error) {
        console.error("[Auth] Error in verifyToken middleware:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};