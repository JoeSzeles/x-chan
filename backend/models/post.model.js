import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		text: {
			type: String,
			required: true,
		},
		img: {
			type: String,
		},
		likes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		reposts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		bookmarkedBy: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			}
		],
		ratings: [
			{
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
			}
		],
		viewCount: {
			type: Number,
			default: 0
		}
	},
	{ timestamps: true }
);

const postSchema = new mongoose.Schema(
	{
		user: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		title: {
			type: String,
			default: "No title"
		},
		bot: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "NewsBot"
		},
		postNumber: {
			type: Number,
			unique: true,
			sparse: true
		},
		threadId: {
			type: Number,
			unique: true,
			sparse: true
		},
		text: {
			type: String,
			required: true,
		},
		img: {
			type: String,
		},
		videoUrl: {
			type: String,
		},
		likes: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		reposts: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			},
		],
		comments: [{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment",
		}],
		bookmarkedBy: [
			{
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
			}
		],
		ratings: [
			{
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
			}
		],
		viewCount: {
			type: Number,
			default: 0
		},
		originalPost: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Post"
		},
		originalComment: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Comment"
		},
		article: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "NewsArticle"
		},
		board: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "Board"
		},
		boardName: {
			type: String,
			required: function() { return this.isThread; }
		},
		isRepost: {
			type: Boolean,
			default: false
		},
		isThread: {
			type: Boolean,
			default: false
		},
		repostSource: {
			type: {
				type: String,
				enum: ['4chan', 'internal', 'external'],
				required: function() { return this.isRepost; }
			},
			board: String,
			threadId: String,
			url: String
		}
	},
	{ timestamps: true }
);

// Add indexes for better query performance
postSchema.index({ user: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ "comments.user": 1 });
postSchema.index({ "comments.createdAt": -1 });

// Add pre-save middleware to generate post number if not provided
postSchema.pre('save', async function(next) {
	if (!this.postNumber) {
		try {
		// Get the highest post number and increment by 1
		const highestPost = await this.constructor.findOne({}, {}, { sort: { 'postNumber': -1 } });
			let newPostNumber = highestPost ? highestPost.postNumber + 1 : 1;
			
			// Keep trying until we find an unused post number
			while (await this.constructor.findOne({ postNumber: newPostNumber })) {
				newPostNumber++;
			}
			
			this.postNumber = newPostNumber;
		} catch (error) {
			console.error('Error generating post number:', error);
			// If there's an error, use timestamp as fallback
			this.postNumber = Date.now();
		}
	}
	next();
});

// Add static method to get post by number
postSchema.statics.findByNumber = function(postNumber) {
	return this.findOne({ postNumber });
};

const Post = mongoose.model("Post", postSchema);

export default Post;
