import { generateTokenAndSetCookie } from "../lib/utils/generateToken.js";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const signup = async (req, res) => {
	try {
		const { fullName, username, email, password } = req.body;

		// Validate required fields
		if (!fullName || !username || !email || !password) {
			return res.status(400).json({ error: "All fields are required" });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return res.status(400).json({ error: "Invalid email format" });
		}

		const existingUser = await User.findOne({ username });
		if (existingUser) {
			return res.status(400).json({ error: "Username is already taken" });
		}

		const existingEmail = await User.findOne({ email });
		if (existingEmail) {
			return res.status(400).json({ error: "Email is already taken" });
		}

		if (password.length < 6) {
			return res.status(400).json({ error: "Password must be at least 6 characters long" });
		}

		const salt = await bcrypt.genSalt(10);
		const hashedPassword = await bcrypt.hash(password, salt);

		const newUser = new User({
			fullName,
			username,
			email,
			password: hashedPassword,
		});

		if (newUser) {
			// Check if JWT_SECRET is set
			if (!process.env.JWT_SECRET) {
				console.error("JWT_SECRET is not set in environment variables");
				return res.status(500).json({ error: "Server configuration error" });
			}

			generateTokenAndSetCookie(newUser._id, res);
			await newUser.save();

			res.status(201).json({
				_id: newUser._id,
				fullName: newUser.fullName,
				username: newUser.username,
				email: newUser.email,
				followers: newUser.followers,
				following: newUser.following,
				profileImg: newUser.profileImg,
				coverImg: newUser.coverImg,
			});
		} else {
			res.status(400).json({ error: "Invalid user data" });
		}
	} catch (error) {
		console.error("Error in signup controller:", error);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const login = async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await User.findOne({ username });
		const isPasswordCorrect = await bcrypt.compare(password, user?.password || "");

		if (!user || !isPasswordCorrect) {
			return res.status(400).json({ error: "Invalid username or password" });
		}

		const token = generateTokenAndSetCookie(user._id, res);

		res.status(200).json({
			_id: user._id,
			fullName: user.fullName,
			username: user.username,
			email: user.email,
			followers: user.followers,
			following: user.following,
			profileImg: user.profileImg,
			coverImg: user.coverImg,
			token
		});
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const logout = async (req, res) => {
	try {
		// Clear the JWT cookie
		res.cookie("jwt", "", {
			maxAge: 0,
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			path: '/'
		});
		
		console.log('[Auth] User logged out successfully');
		res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.error("Error in logout controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};

export const getMe = async (req, res) => {
	try {
		if (!req.user || !req.user._id) {
			console.log('[Auth] getMe called without valid user in request');
			return res.status(401).json({ error: "Not authenticated" });
		}
		
		const user = await User.findById(req.user._id).select("-password");
		
		if (!user) {
			console.log('[Auth] User not found in database:', req.user._id);
			return res.status(404).json({ error: "User not found" });
		}
		
		// Refresh the JWT token to extend session
		const token = req.cookies.jwt;
		if (token) {
			// Refresh the cookie with the same token but reset expiry
			res.cookie("jwt", token, {
				maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax',
				path: '/'
			});
		}
		
		console.log('[Auth] User data retrieved successfully for ID:', user._id);
		res.status(200).json(user);
	} catch (error) {
		console.error("Error in getMe controller", error.message);
		res.status(500).json({ error: "Internal Server Error" });
	}
};
