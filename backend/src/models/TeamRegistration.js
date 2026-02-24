const mongoose = require("mongoose");

// a schema for each team member their status and joining date
const teamMemberSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	status: {
		type: String,
		enum: ["accepted", "left"],
		default: "accepted",
	},
	joinedAt: {
		type: Date,
		default: Date.now,
	},
}, { _id: false });

// a schema for the invite sent out by the leader
const inviteSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true,
		lowercase: true,
		trim: true,
	},
	status: {
		type: String,
		enum: ["pending", "accepted", "rejected"],
		default: "pending",
	},
	respondedAt: {
		type: Date,
	},
}, { _id: false });

// set of eventId, team mem ids, invite etc
const teamRegistrationSchema = new mongoose.Schema({
	eventId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Event",
		required: true,
		index: true,
	},
	leaderId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
		index: true,
	},
	teamName: {
		type: String,
		required: true,
		trim: true,
	},
	teamSize: {
		type: Number,
		required: true,
		min: 2,
	},
	inviteCode: {
		type: String,
		required: true,
		unique: true,
		index: true,
	},
	members: [teamMemberSchema],
	invites: [inviteSchema],
	formResponses: [{
		question: String,
		answer: mongoose.Schema.Types.Mixed,
	}],
	status: {
		type: String,
		enum: ["pending", "completed"],
		default: "pending",
		index: true,
	},
	completedAt: {
		type: Date,
	},
}, { timestamps: true });

// one leader can keep only one active team per event
teamRegistrationSchema.index(
	{ eventId: 1, leaderId: 1, status: 1 },
	{ unique: true, partialFilterExpression: { status: "pending" } },
);

module.exports = mongoose.model("TeamRegistration", teamRegistrationSchema);
