import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema(
	{
		name: {
			type: String,
			required: true,
			trim: true,
		},
		description: {
			type: String,
			required: true,
			trim: true,
		},
		status: {
			type: String,
			required: true,
			enum: ["operational", "degraded", "maintenance", "outage"],
			default: "operational"
		},
		category: {
			type: String,
			required: true,
			enum: ["core", "feature", "integration", "other"],
		},
		maintenanceSchedule: {
			startTime: Date,
			endTime: Date,
			description: String
		},
		lastUpdated: {
			type: Date,
			default: Date.now
		},
		updatedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true
		}
	},
	{ timestamps: true }
);

// Add indexes
serviceSchema.index({ name: 'text', description: 'text' });
serviceSchema.index({ status: 1, lastUpdated: -1 });
serviceSchema.index({ category: 1 });

const Service = mongoose.model("Service", serviceSchema);

export default Service; 