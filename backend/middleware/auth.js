import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';

export const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            console.error('[Auth] No token provided');
            return res.status(401).json({ 
                success: false,
                error: 'Authentication token is required' 
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('[Auth] Token decoded:', { userId: decoded.userId });

            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                console.error('[Auth] User not found:', decoded.userId);
                return res.status(401).json({ 
                    success: false,
                    error: 'User not found' 
                });
            }

            // Attach user to request object
            req.user = user;
            console.log('[Auth] User authenticated:', { 
                userId: user._id,
                username: user.username 
            });

            next();
        } catch (jwtError) {
            console.error('[Auth] JWT verification failed:', {
                error: jwtError.message,
                token: token.substring(0, 10) + '...'
            });
            return res.status(401).json({ 
                success: false,
                error: 'Invalid or expired token' 
            });
        }
    } catch (error) {
        console.error('[Auth] Authentication error:', {
            error: error.message,
            stack: error.stack
        });
        return res.status(500).json({ 
            success: false,
            error: 'Authentication failed' 
        });
    }
};