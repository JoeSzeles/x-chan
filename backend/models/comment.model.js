import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
	{
		postNumber: {
			type: Number,
			unique: true,
			sparse: true,
			index: true
		},
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		post: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post",
			required: true,
		},
		text: {
			type: String,
			required: true,
		},
		img: {
			type: String,
		},
		parentComment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
			default: null,
		},
		replies: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
		}],
		likes: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		}],
		reposts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		repostCount: {
			type: Number,
			default: 0
		},
		bookmarkedBy: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
		}],
		ratings: [{
			user: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				required: true
			},
			rating: {
				type: Number,
				required: true,
				min: 1,
				max: 5
			}
		}],
		viewCount: {
			type: Number,
			default: 0
		}
	},
	{ timestamps: true }
);

// Add indexes for better query performance
commentSchema.index({ post: 1, createdAt: -1 });
commentSchema.index({ parentComment: 1, createdAt: -1 });
commentSchema.index({ user: 1, createdAt: -1 });

// Add pre-save middleware to generate post number if not provided
commentSchema.pre('save', async function(next) {
	if (!this.postNumber) {
		// Get the highest post number from both posts and comments
		const [highestPost, highestComment] = await Promise.all([
			mongoose.model('Post').findOne({}, {}, { sort: { 'postNumber': -1 } }),
			this.constructor.findOne({}, {}, { sort: { 'postNumber': -1 } })
		]);

		const highestPostNumber = highestPost ? highestPost.postNumber : 0;
		const highestCommentNumber = highestComment ? highestComment.postNumber : 0;
		this.postNumber = Math.max(highestPostNumber, highestCommentNumber) + 1;
	}
	next();
});

// Add static method to get comment by number
commentSchema.statics.findByNumber = function(postNumber) {
	return this.findOne({ postNumber });
};

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;