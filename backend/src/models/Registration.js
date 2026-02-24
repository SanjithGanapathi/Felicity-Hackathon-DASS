const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Event",
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    status: {
        type: String,
        enum: ["registered", "waitlisted", "cancelled", "attended"],
        default: "registered",
    },
    teamName: { 
		type: String,
	},
    teamMembers: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }],
    formResponses: [{
        question: String,
        answer: mongoose.Schema.Types.Mixed,
    }],
    ticketId: {
		type: String,
		index: true,
	},
    qrCodeUrl: {
		type: String,
	},
}, { timestamps: true }
);

// a user can only register for an event oen time
registrationSchema.index(
	{ 
		eventId: 1, 
		userId: 1,
	}, 
	{ 
		unique: true,
	},
);

module.exports = mongoose.model("Registration", registrationSchema);
