import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (userId, res) => {
	const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
		expiresIn: "15d",
	});

	// Configure cookie settings based on environment
	const isProduction = process.env.NODE_ENV === 'production';
	
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
};
