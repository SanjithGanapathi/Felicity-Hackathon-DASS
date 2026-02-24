const mongoose = require("mongoose");

const merchOrderSchema = new mongoose.Schema({
	eventId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Event",
		required: true,
		index: true,
	},
	organizerId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organizer",
		required: true,
		index: true,
	},
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
		index: true,
	},
	itemName: {
		type: String,
		required: true,
		trim: true,
	},
	variant: {
		type: String,
		trim: true,
		default: "",
	},
	quantity: {
		type: Number,
		required: true,
		min: 1,
	},
	unitPrice: {
		type: Number,
		required: true,
		min: 0,
	},
	totalAmount: {
		type: Number,
		required: true,
		min: 0,
	},
	paymentProofUrl: {
		type: String,
		trim: true,
		default: "",
	},
	status: {
		type: String,
		enum: ["pending_proof", "pending_approval", "approved", "rejected"],
		default: "pending_proof",
		index: true,
	},
	reviewComment: {
		type: String,
		trim: true,
		default: "",
	},
	reviewedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
	reviewedAt: {
		type: Date,
	},
}, { timestamps: true });

merchOrderSchema.index({ eventId: 1, userId: 1, itemName: 1, variant: 1 });

module.exports = mongoose.model("MerchOrder", merchOrderSchema);
