import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// User cache with better memory management
const userCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes cache time

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, data] of userCache.entries()) {
    if (now > data.expiresAt) {
      userCache.delete(userId);
    }
  }
}, 60 * 1000); // Check every minute

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

        console.log('[Auth] Token found with length:', token.length);
        
        try {
            if (!process.env.JWT_SECRET) {
                console.error('[Auth] JWT_SECRET is not defined');
                return res.status(500).json({ error: "Server configuration error" });
            }
            
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            if (!decoded || !decoded.userId) {
                console.log('[Auth] Invalid token payload');
                return res.status(401).json({ error: "Unauthorized - Invalid Token" });
            }
            
            const userId = decoded.userId;
            console.log('[Auth] Token decoded successfully for user:', userId);

            // Check cache first for performance
            const cachedData = userCache.get(userId);
            if (cachedData && cachedData.expiresAt > Date.now()) {
                req.user = cachedData.user;
                console.log('[Auth] User retrieved from cache');
                
                // Always reset cookie expiration on successful authentication
                res.cookie('jwt', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax', // Changed from 'strict' to improve third-party cookie handling
                    path: '/',
                    maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
                });
                
                return next();
            }

            // Fetch user from database
            const user = await User.findById(userId).select("-password");
            
            if (!user) {
                console.log('[Auth] User not found for ID:', userId);
                res.clearCookie('jwt');
                return res.status(404).json({ error: "User not found" });
            }

            console.log('[Auth] User authenticated successfully');

            // Cache user with expiration
            userCache.set(userId, {
                user,
                expiresAt: Date.now() + CACHE_TTL
            });

            // Always reset cookie expiration on successful authentication
            res.cookie('jwt', token, {
                httpOnly: true, 
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax', // Changed from 'strict' to improve cross-site handling
                path: '/',
                maxAge: 15 * 24 * 60 * 60 * 1000 // 15 days
            });

            req.user = user;
            next();
        } catch (jwtError) {
            console.error('[Auth] JWT verification failed:', jwtError.message);
            
            // Clear invalid token
            res.clearCookie('jwt', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/'
            });
            
            return res.status(401).json({ error: "Unauthorized - Invalid Token" });
        }
    } catch (error) {
        console.error("[Auth] Error in verifyToken middleware:", error);
        res.status(500).json({ error: "Internal server error" });
    }
};