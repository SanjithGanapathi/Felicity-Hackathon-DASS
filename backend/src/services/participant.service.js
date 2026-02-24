const User = require("../models/User");
const Registration = require("../models/Registration");
const Organizer = require("../models/Organizer");
const Event = require("../models/Event");
const MerchOrder = require("../models/MerchOrder");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");

const createServiceError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const fetchProfile = async (userId) => {
	const user = await User.findById(userId)
		.select("-passwordHash") // exclude the hashed passwrod
		.populate("participantProfile.following", "name category") // fetch the organizers name and category by using the ObjectId strored
	;
	
	if(!user) {
		throw createServiceError("User not found", 404);
	}

	return user;
};

const updateProfile = async (userId, updates) => {
	// set of all updates for the query
	const updateSet = {};
	const allowedFields = ["firstName", "lastName", "interests", "contactNumber", "collegeOrOrg"];
	const updateKeys = Object.keys(updates || {});

	if(updateKeys.length === 0) {
		throw createServiceError("No profile fields provided for update", 400);
	}

	const hasInvalidField = updateKeys.some((key) => !allowedFields.includes(key));
	if(hasInvalidField) {
		throw createServiceError("Invalid profile fields in update request", 400);
	}

	if(typeof updates.firstName === "string" && updates.firstName.trim().length > 0) {
		updateSet.firstName = updates.firstName.trim();
	}
	if(typeof updates.lastName === "string" && updates.lastName.trim().length > 0) {
		updateSet.lastName = updates.lastName.trim();
	}

	if(Array.isArray(updates.interests)) {
		const hasInvalidInterest = updates.interests.some((item) => typeof item !== "string" || item.trim().length === 0);
		if(hasInvalidInterest) {
			throw createServiceError("Interests must be a non-empty string array", 400);
		}
		updateSet["participantProfile.interests"] = updates.interests.map((item) => item.trim());
	}
	if(typeof updates.contactNumber === "string") {
		const contactNumber = updates.contactNumber.trim();
		if(contactNumber.length < 7 || contactNumber.length > 15) {
			throw createServiceError("Contact number must be between 7 and 15 characters", 400);
		}
		updateSet["participantProfile.contactNumber"] = contactNumber;
	}
	if(typeof updates.collegeOrOrg === "string" && updates.collegeOrOrg.trim().length > 0) {
		updateSet["participantProfile.collegeOrOrg"] = updates.collegeOrOrg.trim();
	}

	if(Object.keys(updateSet).length === 0) {
		throw createServiceError("No valid profile updates provided", 400);
	}

	const updatedUser = await User.findByIdAndUpdate(
		userId,
		{$set: updateSet},
		{new: true, runValidators: true},
	).select("-passwordHash");

	if(!updatedUser) {
		throw createServiceError("User not found", 404);
	}

	return updatedUser;
};

const updatePassword = async (userId, data) => {
	const { currentPassword, newPassword } = data;

	if(!currentPassword || !newPassword) {
		throw createServiceError("Current password and new password are required", 400);
	}
	if(newPassword.length < 8) {
		throw createServiceError("New password must be at least 8 characters", 400);
	}

	const user = await User.findById(userId);
	if(!user) {
		throw createServiceError("User not found", 404);
	}

	const passwordMatches = await bcrypt.compare(currentPassword, user.passwordHash);
	if(!passwordMatches) {
		throw createServiceError("Current password is incorrect", 400);
	}
	if(await bcrypt.compare(newPassword, user.passwordHash)) {
		throw createServiceError("New password must be different from current password", 400);
	}

	user.passwordHash = await bcrypt.hash(newPassword, 10);
	await user.save();
};

const fetchRegistrations = async (userId) => {
	const registrations = await Registration.find({ userId })
        .populate({
            path: "eventId",
            select: "name eventType startDate endDate status venue organizerId"
        })
        .populate({
			path: "eventId",
			populate: {
				path: "organizerId",
				select: "name",
			},
		})
        .populate("userId", "firstName email") // fetch user details using the id
        .sort({ createdAt: -1 });

    // categories for frontend stuff
    const dashboard = {
        upcoming: [],
        normal: [],
        merchandise: [],
        completed: [],
        cancelled: []
    };

    const now = new Date();

	    registrations.forEach(reg => {
	        const event = reg.eventId;
	        if(!event) {
	        	dashboard.cancelled.push(reg);
	        	return;
	        }
       
		// if events/reg are cancelled
        if(reg.status === "cancelled" || reg.status === "rejected" || event.status === "cancelled") {
            dashboard.cancelled.push(reg);
            return;
        }

        // mechandise
        if(event.eventType === "merchandise") {
            dashboard.merchandise.push(reg);
            return;
        }

		// maintain history bucket for all normal-event participation records
		dashboard.normal.push(reg);

        // past/completed events
		if(new Date(event.endDate) < now || event.status === "completed") {
            dashboard.completed.push(reg);
        } else {
            // normal events
            dashboard.upcoming.push(reg);
        }
    });

    return dashboard;
};

// Participant view of Organizers
const fetchOrganizers = async () => {
	const organizers = await Organizer.find({status: "active"})
		.select("name category description contactEmail");
	return organizers;
};

const fetchOrganizerDetail = async (organizerId) => {
	if(!mongoose.Types.ObjectId.isValid(organizerId)) {
		throw createServiceError("Invalid organizer id", 400);
	}

	const organizer = await Organizer.findById(organizerId).select("name category description contactEmail status");
	if(!organizer || organizer.status !== "active") {
		throw createServiceError("Organizer not found", 404);
	}

	const now = new Date();
	const events = await Event.find({
		organizerId: organizer._id,
		status: { $in: ["published", "completed"] },
	})
		.select("name description eventType startDate endDate status eligibility venue registrationDeadline")
		.sort({ startDate: 1 });

	const upcomingEvents = events.filter((event) => {
		if(event.status === "completed") {
			return false;
		}
		if(!event.startDate) {
			return true;
		}
		return new Date(event.startDate) >= now;
	});
	const pastEvents = events.filter((event) => {
		if(event.status === "completed") {
			return true;
		}
		if(!event.endDate) {
			return false;
		}
		return new Date(event.endDate) < now;
	});

	return {
		organizer,
		upcomingEvents,
		pastEvents,
	};
};

const followOrganizer = async (userId, organizerId) => {
	if(!mongoose.Types.ObjectId.isValid(organizerId)) {
		throw createServiceError("Invalid organizer id", 400);
	}

	const organizer = await Organizer.findById(organizerId);
	if(!organizer) {
		throw createServiceError("Organizer not found", 404);
	}

	const updatedUser = await User.findByIdAndUpdate(userId, 
		{ $addToSet: {"participantProfile.following": organizerId}
	});
	if(!updatedUser) {
		throw createServiceError("User not found", 404);
	}

	return organizer.name;
};

const unfollowOrganizer = async (userId, organizerId) => {
	if(!mongoose.Types.ObjectId.isValid(organizerId)) {
		throw createServiceError("Invalid organizer id", 400);
	}

	const organizer = await Organizer.findById(organizerId);
	if(!organizer) {
		throw createServiceError("Organizer not found", 404);
	}

	const updatedUser = await User.findByIdAndUpdate(userId, {
		$pull : {"participantProfile.following": organizerId}
	});
	if(!updatedUser) {
		throw createServiceError("User not found", 404);
	}

	return organizer.name;
};

// 
const resolveMerchItem = (event, itemName, variant) => {
	const normalizedItemName = typeof itemName === "string" ? itemName.trim().toLowerCase() : "";
	const merchItem = (event.merchItems || []).find(
		(item) => typeof item.name === "string" && item.name.trim().toLowerCase() === normalizedItemName,
	);
	if(!merchItem) {
		throw createServiceError("Merchandise item not found", 404);
	}

	const normalizedVariant = typeof variant === "string" ? variant.trim() : "";
	const availableVariants = Array.isArray(merchItem.variants) ? merchItem.variants.filter(Boolean) : [];
	if(availableVariants.length > 0) {
		if(!normalizedVariant || !availableVariants.includes(normalizedVariant)) {
			throw createServiceError("Invalid merchandise variant", 400);
		}
	}

	return { merchItem, normalizedVariant };
};

const createMerchOrder = async (userId, payload) => {
	const { eventId, itemName, variant, quantity, paymentProofUrl } = payload || {};
	if(!mongoose.Types.ObjectId.isValid(eventId)) {
		throw createServiceError("Invalid event id", 400);
	}

	const event = await Event.findById(eventId);
	if(!event) {
		throw createServiceError("Event not found", 404);
	}
	if(event.eventType !== "merchandise") {
		throw createServiceError("This event does not support merchandise purchases", 400);
	}
	if(event.status !== "published" || event.registrationOpen === false) {
		throw createServiceError("Purchases are closed for this merchandise event", 400);
	}
	if(event.registrationDeadline && new Date() > new Date(event.registrationDeadline)) {
		throw createServiceError("Purchase deadline has passed", 400);
	}

	const requestedQuantity = Number(quantity);
	if(Number.isNaN(requestedQuantity) || requestedQuantity < 1) {
		throw createServiceError("quantity must be at least 1", 400);
	}

	const { merchItem, normalizedVariant } = resolveMerchItem(event, itemName, variant);
	if((merchItem.stock || 0) < requestedQuantity) {
		throw createServiceError("Requested quantity is not available in stock", 400);
	}

	const existingQuantityResult = await MerchOrder.aggregate([
		{
			$match: {
				eventId: event._id,
				userId: new mongoose.Types.ObjectId(userId),
				itemName: merchItem.name,
				variant: normalizedVariant,
				status: { $ne: "rejected" },
			},
		},
		{
			$group: {
				_id: null,
				totalOrdered: { $sum: "$quantity" },
			},
		},
	]);
	const existingQuantity = existingQuantityResult[0]?.totalOrdered || 0;
	const limitPerUser = Number(merchItem.limitPerUser || 1);
	if(existingQuantity + requestedQuantity > limitPerUser) {
		throw createServiceError(`Purchase limit exceeded for this item. Max allowed: ${limitPerUser}`, 400);
	}

	const normalizedProofUrl = typeof paymentProofUrl === "string" ? paymentProofUrl.trim() : "";
	const order = await MerchOrder.create({
		eventId: event._id,
		organizerId: event.organizerId,
		userId,
		itemName: merchItem.name,
		variant: normalizedVariant,
		quantity: requestedQuantity,
		unitPrice: Number(merchItem.price || 0),
		totalAmount: Number(merchItem.price || 0) * requestedQuantity,
		paymentProofUrl: normalizedProofUrl,
		status: normalizedProofUrl ? "pending_approval" : "pending_proof",
	});

	return order;
};

// submit the payment url 
const submitMerchPaymentProof = async (userId, orderId, payload) => {
	if(!mongoose.Types.ObjectId.isValid(orderId)) {
		throw createServiceError("Invalid order id", 400);
	}

	// check is the payment url exists
	const paymentProofUrl = payload?.paymentProofUrl;
	if(typeof paymentProofUrl !== "string" || paymentProofUrl.trim().length === 0) {
		throw createServiceError("paymentProofUrl is required", 400);
	}

	// get the merch order to check for fields
	const order = await MerchOrder.findById(orderId);
	if(!order) {
		throw createServiceError("Order not found", 404);
	}
	// check if the same users order
	if(order.userId.toString() !== userId.toString()) {
		throw createServiceError("Forbidden: cannot update another participant's order", 403);
	}
	// approved orders cannot be modified
	if(order.status === "approved") {
		throw createServiceError("Approved orders cannot be modified", 409);
	}

	// set the payment url and set the status for pending approval
	order.paymentProofUrl = paymentProofUrl.trim();
	order.status = "pending_approval";
	order.reviewComment = "";
	order.reviewedBy = undefined;
	order.reviewedAt = undefined;
	await order.save();

	return order;
};

// get all the merch orders for the userId with the required params
const fetchMyMerchOrders = async (userId, queryParams) => {
	// get the eventId and status from the params
	const { eventId, status } = queryParams || {};
	const query = { userId };

	// check for valide eventId
	if(eventId) {
		if(!mongoose.Types.ObjectId.isValid(eventId)) {
			throw createServiceError("Invalid event id", 400);
		}
		query.eventId = eventId;
	}
	if(status) {
		query.status = status;
	}

	// populate the orders with the event name and type 
	const orders = await MerchOrder.find(query)
		.populate("eventId", "name eventType")
		.sort({ createdAt: -1 });

	return orders;
};

module.exports = {
	fetchProfile,
	updateProfile,
	updatePassword,
	fetchRegistrations,
	fetchOrganizers,
	fetchOrganizerDetail,
	followOrganizer,
	unfollowOrganizer,
	createMerchOrder,
	submitMerchPaymentProof,
	fetchMyMerchOrders,
};
