// User data model
const mongoose = require("mongoose");

const participantProfileSchema = new mongoose.Schema({
	participantType : {
		type: String,
		enum: ["IIIT", "Non-IIIT"],
		required: true,
	},
	
	collegeOrOrg: {
    	type: String,
	    required: true,
	},
	contactNumber: {
    	type: String,
		required: true,
	},
	preferencesId: {
    	type: mongoose.Schema.Types.ObjectId,
	    ref: "Preferences",
	},
	following: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organizer",
	}],
	interests: [{
		type: String,
		trim: true,
	}],
},
);
			
const userSchema = new mongoose.Schema({
	firstName : {
		type: String, 
		required: true,
		trim: true,
	}, 

	lastName : {
		type: String, 
		required: true,
		trim: true,
	}, 

	passwordHash : {
		type: String,
		required: true,
	},

	email : {
		type: String, 
		required: true,
		unique: true,
		lowercase: true,
		index: true,
	}, 

	role : {
		type: String, 
		enum: ["admin", "organizer", "participant"], 
		required: true,
	},
	participantProfile: {
		type: participantProfileSchema,
		required: false,
 	},
	organizerProfileId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Organizer",
		required: false,
	},
},
	{ timestamps: true,},
);

module.exports = mongoose.model("User", userSchema);
