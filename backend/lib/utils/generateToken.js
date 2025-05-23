import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
	try {
		if (!process.env.JWT_SECRET) {
			console.error('[Auth] JWT_SECRET is not configured!');
			throw new Error('JWT configuration error');
		}
		
		// Generate the token with a shorter expiry (requiring more frequent refreshes)
		const token = jwt.sign({ userId, timestamp: Date.now() }, process.env.JWT_SECRET, {
			expiresIn: "15d",
		});

		// Configure cookie settings based on environment
		const isProduction = process.env.NODE_ENV === 'production';
		
		// Set the cookie with proper security settings
		res.cookie("jwt", token, {
			maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days in milliseconds
			httpOnly: true, // Prevent XSS attacks by making the cookie inaccessible to JavaScript
			sameSite: "lax", // Works better for authentication in modern browsers
			secure: isProduction, // Only require HTTPS in production
			path: '/', // Make cookie available for all paths
			domain: undefined, // Let the browser set the domain automatically
		});

		console.log('[Auth] Token generated and cookie set for user:', userId);
		return token;
	} catch (error) {
		console.error('[Auth] Error generating token:', error);
		throw error;
	}
};
