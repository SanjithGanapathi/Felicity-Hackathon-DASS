 const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		index: "text", // to enable seach by name
	},
	description: {
		type: String,
		required: true,
		index: "text", // to enable search by description
	},
	eventType: {
		type: String,
		enum: ["normal", "merchandise"],
		required: true,
	},

	organizerId: {
        type: mongoose.Schema.Types.ObjectId,
		ref: "Organizer", 
        required: true,
    },
    
    status: {
        type: String,
        enum: ["draft", "published", "cancelled", "completed"],
        default: "draft",
    },
    registrationDeadline: { 
		type: Date, 
		required: true,
	},
    startDate: { 
		type: Date,
	}, 
    endDate: { 
		type: Date,
	},

    registrationLimit: { 
		type: Number, 
		default: 0,
		min: 0,
	}, // 0 = unlimited 
    registrationCount: { 
		type: Number, default: 0,
	},
	registrationOpen: {
		type: Boolean,
		default: true,
	},
    registrationFee: { 
		type: Number, 
		default: 0,
		min: 0,
	},

    eligibility: {
        type: String,
        enum: ["all", "iiit_only", "non_iiit_only"],
        default: "all",
    },
    tags: [{ 
		type: String, 
	}], 

    // for normal Events 
    venue: { type: String },
    isTeamEvent: { 
		type: Boolean, 
		default: false,
	}, 
    minTeamSize: { 
		type: Number, 
		default: 1,
	},
    maxTeamSize: { 
		type: Number, 
		default: 1,
	},
    
    // Custom Form Builder 
    formSchema: [{
        label: String, // 
        fieldType: { type: String, enum: ["text", "number", "file", "dropdown", "checkbox"] },
        required: Boolean,
        options: [String], // this is for dropdowns
    }],

    merchItems: [{
		name: String,
		price: Number,
        stock: Number,
        variants: [String], // ["S", "M", "L", "XL"]
        limitPerUser: { 
			type: Number, 
			default: 1,
		},
    }],
    posterUrl: { 
		type: String ,
	} 
}, 
	{ timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
