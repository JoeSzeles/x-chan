import mongoose from "mongoose";

const newsSchema = new mongoose.Schema(
	{
		title: {
			type: String,
			required: true,
			trim: true,
		},
		content: {
			type: String,
			required: true,
		},
		author: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
		category: {
			type: String,
			required: true,
			enum: ["general", "tech", "business", "entertainment", "sports", "other"],
		},
		imageUrl: {
			type: String,
		},
		tags: [{
			type: String,
			trim: true
		}],
		isPublished: {
			type: Boolean,
			default: false
		},
		publishedAt: {
			type: Date,
		}
	},
	{ timestamps: true }
);

// Add indexes
newsSchema.index({ title: 'text', content: 'text' });
newsSchema.index({ category: 1, publishedAt: -1 });
newsSchema.index({ author: 1, createdAt: -1 });

const News = mongoose.model("News", newsSchema);

export default News; 