// Organizer data model
const mongoose = require("mongoose");

const organizerSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},

	contactEmail: {
		type: String,
		required: true,
	},
		
	contactNumber: {
		type: String,
	},

	category: {
		type: String,
		required: true,
	},

	description: {
		type: String,
	},
	discordWebhookUrl: {
		type: String,
		default: "",
	},

	status: {
		type: String,
		enum: ["active", "disabled", "archived"],
		default: "active",
	},
	
	accountId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},

	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
},
	{timestamps: true},
);

module.exports = mongoose.model("Organizer", organizerSchema);
