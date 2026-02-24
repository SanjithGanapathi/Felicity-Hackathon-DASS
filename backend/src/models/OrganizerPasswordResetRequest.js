// a data model to hold password requests created by organizers and its review details

const mongoose = require("mongoose");

const organizerPasswordResetRequestSchema = new mongoose.Schema({
	organizerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organizer",
		required: true,
	},
	organizerAccountId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	reason: {
		type: String,
		required: true,
		trim: true,
	},
	status: {
		type: String,
		enum: ["pending", "approved", "rejected"],
		default: "pending",
	},
	adminComment: {
		type: String,
		trim: true,
		default: "",
	},
	requestedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	reviewedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
	reviewedAt: {
		type: Date,
	},
}, { timestamps: true });

module.exports = mongoose.model("OrganizerPasswordResetRequest", organizerPasswordResetRequestSchema);
