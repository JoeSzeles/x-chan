import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
	{
		username: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		fullName: {
			type: String,
			required: true,
		},
		password: {
			type: String,
			required: true,
			minLength: 6,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			lowercase: true,
		},
		isSystem: {
			type: Boolean,
			default: false
		},
		followers: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				default: [],
			},
		],
		following: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				default: [],
			},
		],
		profileImg: {
			type: String,
			default: "",
		},
		coverImg: {
			type: String,
			default: "",
		},
		coverPhoto: {
			type: {
				type: String,
				enum: ['image', 'video', 'content'],
				default: 'image'
			},
			content: String,
			metadata: {
				videoId: String,
				contentId: String,
				source: String
			}
		},
		bio: {
			type: String,
			default: "",
		},
		link: {
			type: String,
			default: "",
		},
		location: {
			country: {
				type: String,
				default: "",
			},
			countryCode: {
				type: String,
				default: "",
			}
		},
		likedPosts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Post",
				default: [],
			},
		],
		bookmarks: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "Post",
				default: [],
			},
		],
		reposts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				default: [],
			},
		],
		lastSeen: {
			type: Date,
			default: Date.now,
		},
		settings: {
			notifications: {
				email: { type: Boolean, default: true },
				push: { type: Boolean, default: true },
				mentions: { type: Boolean, default: true },
				commentReplies: { type: Boolean, default: true },
				milestones: { type: Boolean, default: true },
				trendingTopics: { type: Boolean, default: true },
				boardActivity: { type: Boolean, default: true },
				systemAnnouncements: { type: Boolean, default: true }
			},
			privacy: {
				privateProfile: { type: Boolean, default: false },
				showOnlineStatus: { type: Boolean, default: true }
			},
			appearance: {
				theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
				fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
				wideMode: { type: Boolean, default: false }
			},
			language: {
				displayLanguage: { type: String, default: 'en' }
			},
			accessibility: {
				highContrast: { type: Boolean, default: false },
				reduceMotion: { type: Boolean, default: false }
			}
		}
	},
	{ timestamps: true }
);

// Update lastSeen before saving
userSchema.pre('save', function(next) {
    this.lastSeen = new Date();
    next();
});

const User = mongoose.model("User", userSchema);

export default User;