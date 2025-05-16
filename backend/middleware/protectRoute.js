import User from "../models/user.model.js";
import jwt from "jsonwebtoken";

export const protectRoute = async (req, res, next) => {
	try {
		console.log('ProtectRoute middleware called');
		console.log('Headers:', req.headers);
		console.log('Cookies:', req.cookies);
		
		// Try to get token from cookies first
		let token = req.cookies.jwt;
		
		// If no token in cookies, try to get it from Authorization header
		if (!token && req.headers.authorization) {
			token = req.headers.authorization.split(' ')[1];
		}
		
		console.log('JWT token:', token);

		if (!token) {
			console.log('No token found in cookies or headers');
			return res.status(401).json({
				success: false,
				error: "Not authorized, no token"
			});
		}

		try {
			const decoded = jwt.verify(token, process.env.JWT_SECRET);
			console.log('Decoded token:', decoded);

			const user = await User.findById(decoded.userId).select("-password");
			console.log('Found user:', user ? 'Yes' : 'No');

			if (!user) {
				console.log('User not found in database');
				return res.status(401).json({
					success: false,
					error: "Not authorized, user not found"
				});
			}

			// Update lastSeen
			await User.findByIdAndUpdate(user._id, { lastSeen: new Date() });

			req.user = user;
			console.log('User authenticated successfully');
			next();
		} catch (error) {
			console.log('Token verification failed:', error.message);
			return res.status(401).json({
				success: false,
				error: "Not authorized, token failed"
			});
		}
	} catch (error) {
		console.error('ProtectRoute error:', error);
		return res.status(500).json({
			success: false,
			error: "Internal server error"
		});
	}
};
