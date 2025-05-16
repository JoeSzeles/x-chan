import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			trim: true,
		},
		creator: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		followers: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		}],
		posts: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post"
		}],
		isActive: {
			type: Boolean,
			default: true
		},
		tags: [{
			type: String,
			trim: true
		}]
	},
	{ timestamps: true }
);

// Add indexes
threadSchema.index({ title: 'text', description: 'text' });
threadSchema.index({ creator: 1, createdAt: -1 });
threadSchema.index({ followers: 1 });

const Thread = mongoose.model("Thread", threadSchema);

export default Thread; 