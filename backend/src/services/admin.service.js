const Organizer = require("../models/Organizer");
const User = require("../models/User");
const OrganizerPasswordResetRequest = require("../models/OrganizerPasswordResetRequest");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const mongoose = require("mongoose");

const createServiceError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const ensureValidObjectId = (value, fieldName) => {
	if(!mongoose.Types.ObjectId.isValid(value)) {
		throw createServiceError(`Invalid ${fieldName}`, 400);
	}
};

const allowedOrganizerCategories = new Set([
	"Technology & Coding",
	"Arts & Culture",
	"Sports",
	"Music",
	"Gaming",
	"Business",
]);

const createOrganizer = async (payload, adminUserId) => {
	const { name, contactEmail, contactNumber, category, description } = payload;

	// validate required fields before creating account records
	if(!name || !contactEmail || !category) {
		throw createServiceError("Name, Category, and Contact Email are required", 400);
	}
	if(!allowedOrganizerCategories.has(category)) {
		throw createServiceError("Invalid organizer category", 400);
	}

	// generate organizer login email using organizer name
	const cleanName = name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
	const loginEmail = `${cleanName}@felicity.iiit.ac.in`;
	const userExists = await User.findOne({email: loginEmail});
	if(userExists) {
		throw createServiceError(`Organizer account '${loginEmail}' already exists`, 409);
	}

	// generate credentials and hash password before storage
	const plainPassword = crypto.randomBytes(8).toString("hex");
	const passwordHash = await bcrypt.hash(plainPassword, 10);

	const newUser = new User({
		firstName: name,
		lastName: "(Organizer)",
		email: loginEmail,
		passwordHash: passwordHash,
		role: "organizer",
	});

	const newOrganizer = new Organizer({
		name: name,
		category: category,
		contactEmail: contactEmail,
		contactNumber: contactNumber,
		description: description,
		status: "active",
		accountId: newUser._id,
		createdBy: adminUserId,
	});

	// link user and organizer profile ids before persisting records
	newUser.organizerProfileId = newOrganizer._id;

	await newUser.save();
	await newOrganizer.save();

	return {
		credentials: {
			loginEmail: loginEmail,
			password: plainPassword,
			note: "Copy these credentials now. The password cannot be retrieved later."
		},
		organizer: newOrganizer,
	};
};

const getAllOrganizer = async () => {
	const organizers = await Organizer.find()
		.populate("accountId", "email role status")
		.sort({createdAt: -1});

	return organizers;
};

const removeOrganizer = async (organizerId) => {
	// fetch organizer first so associated user account can be removed too
	const organizer = await Organizer.findById(organizerId);
	if(!organizer) {
		throw createServiceError("Organizer not found", 404);
	}

	// remove linked user account before deleting organizer record
	if(organizer.accountId) {
		await User.findByIdAndDelete(organizer.accountId);
	}
	await OrganizerPasswordResetRequest.deleteMany({
		$or: [
			{ organizerId: organizer._id },
			{ organizerAccountId: organizer.accountId },
		],
	});

	await Organizer.findByIdAndDelete(organizerId);
};

const updateOrganizerStatus = async (organizerId, payload) => {
	ensureValidObjectId(organizerId, "organizer id");
	const status = payload?.status;
	if(!["active", "disabled", "archived"].includes(status)) {
		throw createServiceError("Invalid organizer status", 400);
	}

	const organizer = await Organizer.findByIdAndUpdate(
		organizerId,
		{ $set: { status } },
		{ new: true, runValidators: true },
	).populate("accountId", "email role status");
	if(!organizer) {
		throw createServiceError("Organizer not found", 404);
	}

	return organizer;
};

const getDashboardSummary = async () => {
	const [totalOrganizers, activeOrganizers, pendingResetRequests, totalResetRequests] = await Promise.all([
		Organizer.countDocuments(),
		Organizer.countDocuments({status: "active"}),
		OrganizerPasswordResetRequest.countDocuments({status: "pending"}),
		OrganizerPasswordResetRequest.countDocuments(),
	]);

	return {
		totalOrganizers,
		activeOrganizers,
		pendingResetRequests,
		totalResetRequests,
	};
};

const getPasswordResetRequests = async (queryParams) => {
	const { status } = queryParams || {};
	const query = {};
	if(status) {
		if(!["pending", "approved", "rejected"].includes(status)) {
			throw createServiceError("Invalid status filter", 400);
		}
		query.status = status;
	}

	// fetch all the password requests and populate it with the organizerId, name, category etc
	const requests = await OrganizerPasswordResetRequest.find(query)
		.sort({ createdAt: -1 })
		.populate("organizerId", "name category")
		.populate("organizerAccountId", "email")
		.populate("reviewedBy", "firstName lastName email");

	return requests;
};

const reviewPasswordResetRequest = async (requestId, adminUserId, payload) => {
	const { action, comment } = payload || {};
	ensureValidObjectId(requestId, "request id");
	ensureValidObjectId(adminUserId, "admin user id");

	// make sure the action is not empty and it only contains approve or reject
	if(!action || !["approve", "reject"].includes(action)) {
		throw createServiceError("Action must be either 'approve' or 'reject'", 400);
	}
	if(action === "reject" && (!comment || comment.trim().length === 0)) {
		throw createServiceError("Comment is required when rejecting a request", 400);
	}

	// get the request by its id
	const request = await OrganizerPasswordResetRequest.findById(requestId);
	if(!request) {
		throw createServiceError("Password reset request not found", 404);
	}

	// throw an error if the status of the request is not pending
	if(request.status !== "pending") {
		throw createServiceError("This request has already been reviewed", 409);
	}

	// now update the request if it was rejected and send the request back
	if(action === "reject") {
		request.status = "rejected";
		request.adminComment = comment?.trim() || "";
		request.reviewedBy = adminUserId;
		request.reviewedAt = new Date();
		await request.save();
		return {
			request,
			credentials: null,
		};
	}

	// if not rejected then generate new organizer password and replace existing hash
	const organizerUser = await User.findById(request.organizerAccountId);
	if(!organizerUser) {
		throw createServiceError("Organizer account not found", 404);
	}

	// then set get the hashed password and store the new password hash in the organizer's field
	const plainPassword = crypto.randomBytes(8).toString("hex");
	const passwordHash = await bcrypt.hash(plainPassword, 10);
	organizerUser.passwordHash = passwordHash;
	await organizerUser.save();

	// set the status and review details
	request.status = "approved";
	request.adminComment = comment?.trim() || "";
	request.reviewedBy = adminUserId;
	request.reviewedAt = new Date();
	await request.save();

	// return the request along with the updated credentials
	return {
		request,
		credentials: {
			loginEmail: organizerUser.email,
			password: plainPassword,
			note: "Share this password with the organizer. It cannot be retrieved later."
		},
	};
};

module.exports = {
	createOrganizer,
	getAllOrganizer,
	removeOrganizer,
	updateOrganizerStatus,
	getDashboardSummary,
	getPasswordResetRequests,
	reviewPasswordResetRequest,
};
