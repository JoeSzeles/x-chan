import bcrypt from "bcryptjs";
import { v2 as cloudinary } from "cloudinary";

// models
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";

export const getUserProfile = async (req, res) => {
	const { username } = req.params;

	try {
		const user = await User.findOne({ username }).select("-password");
		if (!user) return res.status(404).json({ message: "User not found" });

		res.status(200).json(user);
	} catch (error) {
		console.log("Error in getUserProfile: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const followUnfollowUser = async (req, res) => {
	try {
		const { id } = req.params;
		const userToModify = await User.findById(id);
		const currentUser = await User.findById(req.user._id);

		if (id === req.user._id.toString()) {
			return res.status(400).json({ error: "You can't follow/unfollow yourself" });
		}

		if (!userToModify || !currentUser) return res.status(400).json({ error: "User not found" });

		const isFollowing = currentUser.following.includes(id);

		if (isFollowing) {
			// Unfollow the user
			await User.findByIdAndUpdate(id, { $pull: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $pull: { following: id } });

			res.status(200).json({ message: "User unfollowed successfully" });
		} else {
			// Follow the user
			await User.findByIdAndUpdate(id, { $push: { followers: req.user._id } });
			await User.findByIdAndUpdate(req.user._id, { $push: { following: id } });
			// Send notification to the user
			const newNotification = new Notification({
				type: "follow",
				from: req.user._id,
				to: userToModify._id,
			});

			await newNotification.save();

			res.status(200).json({ message: "User followed successfully" });
		}
	} catch (error) {
		console.log("Error in followUnfollowUser: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const getSuggestedUsers = async (req, res) => {
	try {
		const userId = req.user._id;

		const usersFollowedByMe = await User.findById(userId).select("following");

		const users = await User.aggregate([
			{
				$match: {
					_id: { $ne: userId },
				},
			},
			{ $sample: { size: 10 } },
		]);

		// 1,2,3,4,5,6,
		const filteredUsers = users.filter((user) => !usersFollowedByMe.following.includes(user._id));
		const suggestedUsers = filteredUsers.slice(0, 4);

		suggestedUsers.forEach((user) => (user.password = null));

		res.status(200).json(suggestedUsers);
	} catch (error) {
		console.log("Error in getSuggestedUsers: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const updateUser = async (req, res) => {
	const { fullName, email, username, currentPassword, newPassword, bio, link, location, type, content, metadata } = req.body;
	let { profileImg, coverImg } = req.body;

	const userId = req.user._id;

	try {
		let user = await User.findById(userId);
		if (!user) return res.status(404).json({ error: "User not found" });

		if ((!newPassword && currentPassword) || (!currentPassword && newPassword)) {
			return res.status(400).json({ error: "Please provide both current password and new password" });
		}

		if (currentPassword && newPassword) {
			const isMatch = await bcrypt.compare(currentPassword, user.password);
			if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });
			if (newPassword.length < 6) {
				return res.status(400).json({ error: "Password must be at least 6 characters long" });
			}

			const salt = await bcrypt.genSalt(10);
			user.password = await bcrypt.hash(newPassword, salt);
		}

		if (profileImg) {
			try {
			if (user.profileImg) {
					const publicId = user.profileImg.split("/").pop().split(".")[0];
					await cloudinary.uploader.destroy(publicId);
			}

				const uploadedResponse = await cloudinary.uploader.upload(profileImg, {
					folder: "profile_images",
					resource_type: "auto"
				});
			profileImg = uploadedResponse.secure_url;
			} catch (error) {
				console.error("Error uploading profile image:", error);
				return res.status(500).json({ error: "Failed to upload profile image" });
			}
		}

		if (coverImg) {
			try {
			if (user.coverImg) {
					const publicId = user.coverImg.split("/").pop().split(".")[0];
					await cloudinary.uploader.destroy(publicId);
			}

				const uploadedResponse = await cloudinary.uploader.upload(coverImg, {
					folder: "cover_photos",
					resource_type: "auto"
				});
			coverImg = uploadedResponse.secure_url;
			} catch (error) {
				console.error("Error uploading cover image:", error);
				return res.status(500).json({ error: "Failed to upload cover image" });
			}
		}

		// Update user fields
		user.fullName = fullName || user.fullName;
		user.email = email || user.email;
		user.username = username || user.username;
		user.bio = bio || user.bio;
		user.link = link || user.link;
		user.profileImg = profileImg || user.profileImg;
		user.coverImg = coverImg || user.coverImg;
		
		// Update cover photo data if provided
		if (type && content) {
			user.coverPhoto = {
				type,
				content,
				metadata: metadata || {}
			};
		}
		
		if (location) {
			user.location = location;
		}

		user = await user.save();

		// password should be null in response
		user.password = null;

		return res.status(200).json({
			success: true,
			user: user
		});
	} catch (error) {
		console.log("Error in updateUser controller: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const getOnlineUsers = async (req, res) => {
	try {
		const currentUser = await User.findById(req.user._id);
		if (!currentUser) {
			return res.status(404).json({ error: "User not found" });
		}

		// Get users that the current user follows or who follow them
		const users = await User.find({
			$or: [
				{ _id: { $in: currentUser.following } },
				{ followers: currentUser._id }
			],
			lastSeen: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // Online in last 15 minutes
		})
		.select("username fullName profileImg lastSeen")
		.sort({ lastSeen: -1 }) // Sort by most recently active
		.limit(10); // Limit to 10 most recent users

		// If no users found, get some suggested users
		if (users.length === 0) {
			const suggestedUsers = await User.find({
				_id: { $ne: currentUser._id }
			})
			.select("username fullName profileImg lastSeen")
			.sort({ lastSeen: -1 })
			.limit(5);
			
			return res.status(200).json(suggestedUsers);
		}

		res.status(200).json(users);
	} catch (error) {
		console.log("Error in getOnlineUsers: ", error.message);
		res.status(500).json({ error: "Internal server error" });
	}
};

export const updateSettings = async (req, res) => {
	try {
		const userId = req.user._id;
		const { settings } = req.body;

		if (!settings) {
			return res.status(400).json({ error: "Settings are required" });
		}

		const user = await User.findByIdAndUpdate(
			userId,
			{ $set: { settings } },
			{ new: true }
		).select("-password");

		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		res.status(200).json(user);
	} catch (error) {
		console.log("Error in updateSettings controller: ", error.message);
		res.status(500).json({ error: error.message });
	}
};

export const getFollowers = async (req, res) => {
	try {
		const { username } = req.params;
		const user = await User.findOne({ username })
			.populate('followers', 'username name profilePic bio followers following')
			.select('followers');

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Add isFollowing field to each follower
		const followers = user.followers.map(follower => ({
			...follower.toObject(),
			isFollowing: follower.followers.includes(req.user._id)
		}));

		res.status(200).json(followers);
	} catch (error) {
		console.error('Error in getFollowers:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};

export const getFollowing = async (req, res) => {
	try {
		const { username } = req.params;
		const user = await User.findOne({ username })
			.populate('following', 'username name profilePic bio followers following')
			.select('following');

		if (!user) {
			return res.status(404).json({ error: 'User not found' });
		}

		// Add isFollowing field to each following user
		const following = user.following.map(followingUser => ({
			...followingUser.toObject(),
			isFollowing: followingUser.followers.includes(req.user._id)
		}));

		res.status(200).json(following);
	} catch (error) {
		console.error('Error in getFollowing:', error);
		res.status(500).json({ error: 'Internal server error' });
	}
};
