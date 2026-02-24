// auth service funcs

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
// Get the ODM for queries
const User = require("../models/User");
const Organizer = require("../models/Organizer");

const createServiceError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const cookieOptions = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
	maxAge: 7*24*60*60*1000,
};

const registerParticipant = async (data) => {
	const { firstName, lastName, email, password, participantProfile } = data;

	if(!firstName || !lastName || !email || !password || !participantProfile) {
		throw createServiceError("Missing required registration fields", 400);
	}
	if(!participantProfile.participantType || !participantProfile.collegeOrOrg || !participantProfile.contactNumber) {
		throw createServiceError("Missing required participant profile fields", 400);
	}
	if(!["IIIT", "Non-IIIT"].includes(participantProfile.participantType)) {
		throw createServiceError("Invalid participant type", 400);
	}
	if(password.length < 8) {
		throw createServiceError("Password must be at least 8 characters", 400);
	}
	if(!/^\S+@\S+\.\S+$/.test(email)) {
		throw createServiceError("Invalid email format", 400);
	}

	const normalizedEmail = email.trim().toLowerCase();

	// check if user is IIIT and using IIIT email
	if(participantProfile.participantType == "IIIT" 
		&& !normalizedEmail.endsWith("iiit.ac.in")) {
		throw createServiceError("IIIT students must use IIIT email", 400);
	}

	// check if already exisisting
	const exists = await User.findOne({email: normalizedEmail});
	if(exists) {
		throw createServiceError("Email already registered", 409);
	}

	const passwordHash = await bcrypt.hash(password, 10);

	// create the new record
	await User.create({
		...data,
		email: normalizedEmail,
		passwordHash,
		role: "participant"
		}
	);
};

const login = async (data) => {
	const { email, password } = data;
	
	if(!email || !password) {
		throw createServiceError("Email and Password are required", 400);
	}
	const normalizedEmail = email.trim().toLowerCase();
	if(!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
		throw createServiceError("Invalid email format", 400);
	}

	// Check if user if present and signed up
	const user = await User.findOne({email: normalizedEmail});
	if(!user) {
		throw createServiceError("Please Sign Up first", 404);
	}

	const passwordCheck = await bcrypt.compare(password, user.passwordHash);
	if(!passwordCheck) {
		throw createServiceError("Invalid Credentials!!", 401);
	}
	if(user.role === "organizer") {
		const organizerProfile = await Organizer.findById(user.organizerProfileId).select("status");
		if(!organizerProfile) {
			throw createServiceError("Organizer profile not found", 404);
		}
		if(organizerProfile.status !== "active") {
			throw createServiceError("Organizer account is not active", 403);
		}
	}

	// create the jwt token after authenticating for further authorization
	const token = jwt.sign(
		{
			userId: user._id,
			role: user.role,
		},
		process.env.JWT_SECRET,
		{
			expiresIn: "7d",
		},
	);

	return { token, role: user.role };
};

module.exports = ({
	cookieOptions,
	registerParticipant,
	login,
});
