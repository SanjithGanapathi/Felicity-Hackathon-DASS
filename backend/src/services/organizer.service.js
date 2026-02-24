const User = require("../models/User");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const MerchOrder = require("../models/MerchOrder");
const OrganizerPasswordResetRequest = require("../models/OrganizerPasswordResetRequest");
const TeamRegistration = require("../models/TeamRegistration");
const Organizer = require("../models/Organizer");
const eventService = require("./event.service");
const { sendEmailNotification } = require("./notification.service");
const mongoose = require("mongoose");

const createServiceError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

// validate mongodb object ids before db calls to avoid cast errors
const ensureValidObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
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

const buildTicketPayload = (eventId, userId) => {
	const ticketId = `TKT-${String(eventId).slice(-6).toUpperCase()}-${String(userId).slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
	const qrData = JSON.stringify({ ticketId, eventId: String(eventId), userId: String(userId) });
	const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
	return { ticketId, qrCodeUrl };
};

const postDiscordEvent = async (webhookUrl, organizer, event) => {
	if (!webhookUrl || typeof webhookUrl !== "string" || webhookUrl.trim().length === 0) {
		return;
	}

	const payload = {
		content: `New event published by ${organizer.name}`,
		embeds: [
			{
				title: event.name,
				description: event.description || "",
				fields: [
					{ name: "Type", value: event.eventType || "normal", inline: true },
					{ name: "Eligibility", value: event.eligibility || "all", inline: true },
					{ name: "Status", value: event.status || "draft", inline: true },
				],
				timestamp: new Date().toISOString(),
			},
		],
	};

	try {
		const response = await fetch(webhookUrl.trim(), {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});
		if (!response.ok) {
			console.error("Discord webhook post failed with status", response.status);
		}
	} catch (err) {
		console.error("Discord webhook post error", err.message);
	}
};

const getOrganizerProfileId = async (userId) => {
	// fetch organizer profile id from authenticated organizer account
	const organizerUser = await User.findById(userId).select("organizerProfileId");
	if (!organizerUser || !organizerUser.organizerProfileId) {
		throw createServiceError("Organizer profile not found", 404);
	}

	// block all actions if organizer account is disabled or archived
	const organizer = await Organizer.findById(organizerUser.organizerProfileId).select("status");
	if (organizer && organizer.status !== "active") {
		throw createServiceError("Your organizer account has been disabled", 403);
	}

	return organizerUser.organizerProfileId;
};

const createEventForOrganizer = async (userId, payload) => {
	const organizerProfileId = await getOrganizerProfileId(userId);

	// append organizer profile id so event ownership stays consistent
	const event = await eventService.createEvent({
		...payload,
		organizerId: organizerProfileId,
	});

	// publish organizer event updates to discord when webhook is configured
	const organizer = await Organizer.findById(organizerProfileId).select("name discordWebhookUrl");
	if (organizer?.discordWebhookUrl) {
		await postDiscordEvent(organizer.discordWebhookUrl, organizer, event);
	}

	return event;
};

const getOrganizerProfile = async (userId) => {
	const organizerProfileId = await getOrganizerProfileId(userId);
	const organizer = await Organizer.findById(organizerProfileId).select("name category description contactEmail contactNumber discordWebhookUrl accountId");
	if (!organizer) {
		throw createServiceError("Organizer profile not found", 404);
	}

	const account = await User.findById(organizer.accountId).select("email");
	return {
		organizerId: organizer._id,
		name: organizer.name || "",
		category: organizer.category || "",
		description: organizer.description || "",
		contactEmail: organizer.contactEmail || "",
		contactNumber: organizer.contactNumber || "",
		discordWebhookUrl: organizer.discordWebhookUrl || "",
		loginEmail: account?.email || "",
	};
};

const updateOrganizerProfile = async (userId, payload) => {
	const organizerProfileId = await getOrganizerProfileId(userId);
	const organizer = await Organizer.findById(organizerProfileId);
	if (!organizer) {
		throw createServiceError("Organizer profile not found", 404);
	}

	const updates = payload || {};
	const allowedFields = ["name", "category", "description", "contactEmail", "contactNumber", "discordWebhookUrl"];
	const updateKeys = Object.keys(updates);
	if (updateKeys.length === 0) {
		throw createServiceError("No profile fields provided for update", 400);
	}
	const hasInvalidField = updateKeys.some((key) => !allowedFields.includes(key));
	if (hasInvalidField) {
		throw createServiceError("Invalid organizer profile fields in update request", 400);
	}

	if (typeof updates.name === "string" && updates.name.trim().length > 0) {
		organizer.name = updates.name.trim();
	}
	if (typeof updates.category === "string" && updates.category.trim().length > 0) {
		if (!allowedOrganizerCategories.has(updates.category.trim())) {
			throw createServiceError("Invalid organizer category", 400);
		}
		organizer.category = updates.category.trim();
	}
	if (typeof updates.description === "string") {
		organizer.description = updates.description.trim();
	}
	if (typeof updates.contactEmail === "string" && updates.contactEmail.trim().length > 0) {
		const normalizedContactEmail = updates.contactEmail.trim().toLowerCase();
		if (!/^\S+@\S+\.\S+$/.test(normalizedContactEmail)) {
			throw createServiceError("Invalid contact email format", 400);
		}
		organizer.contactEmail = normalizedContactEmail;
	}
	if (typeof updates.contactNumber === "string") {
		const contactNumber = updates.contactNumber.trim();
		if (contactNumber.length > 0 && (contactNumber.length < 7 || contactNumber.length > 15)) {
			throw createServiceError("Contact number must be between 7 and 15 characters", 400);
		}
		organizer.contactNumber = contactNumber;
	}
	if (typeof updates.discordWebhookUrl === "string") {
		const webhookUrl = updates.discordWebhookUrl.trim();
		if (webhookUrl.length > 0) {
			try {
				const parsedUrl = new URL(webhookUrl);
				if (parsedUrl.protocol !== "https:") {
					throw createServiceError("Discord webhook URL must use https", 400);
				}
			} catch (err) {
				if (err.statusCode) {
					throw err;
				}
				throw createServiceError("Invalid Discord webhook URL", 400);
			}
		}
		organizer.discordWebhookUrl = webhookUrl;
	}

	await organizer.save();
	return getOrganizerProfile(userId);
};

const deleteEventForOrganizer = async (userId, eventId) => {
	const organizerProfileId = await getOrganizerProfileId(userId);

	// ensure organizer can delete only own events
	const event = await Event.findById(eventId).select("organizerId");
	if (!event) {
		throw createServiceError("Event not found", 404);
	}
	if (event.organizerId.toString() !== organizerProfileId.toString()) {
		throw createServiceError("Forbidden: cannot delete another organizer's event", 403);
	}

	await Event.findByIdAndDelete(eventId);
};

// get the events with the organizerProfileId and then display them by paging them
const getMyEvents = async (userId, queryParams) => {
	const organizerProfileId = await getOrganizerProfileId(userId);
	const { status, page, limit } = queryParams || {};

	const query = { organizerId: organizerProfileId };
	if (status) {
		query.status = status;
	}

	const pageNum = parseInt(page, 10) || 1;
	const limitNum = parseInt(limit, 10) || 20;
	const skip = (pageNum - 1) * limitNum;

	const events = await Event.find(query)
		.sort({ createdAt: -1 })
		.skip(skip)
		.limit(limitNum);
	const total = await Event.countDocuments(query);

	return { events, total, page: pageNum, pages: Math.ceil(total / limitNum) };
};

const getOngoingEvents = async (userId) => {
	const organizerProfileId = await getOrganizerProfileId(userId);
	const now = new Date();

	const ongoingEvents = await Event.find({
		organizerId: organizerProfileId,
		status: "published",
		startDate: { $lte: now },
		endDate: { $gte: now },
	}).sort({ startDate: 1 });

	return ongoingEvents;
};

// return the event if it is owned by the organizer with the given userId
const getOrganizerOwnedEvent = async (userId, eventId) => {
	ensureValidObjectId(eventId, "event id");
	const organizerProfileId = await getOrganizerProfileId(userId);
	const event = await Event.findById(eventId);
	if (!event) {
		throw createServiceError("Event not found", 404);
	}
	if (event.organizerId.toString() !== organizerProfileId.toString()) {
		throw createServiceError("Forbidden: cannot access another organizer's event", 403);
	}

	return event;
};

// 
const updateEventForOrganizer = async (userId, eventId, updates) => {
	const event = await getOrganizerOwnedEvent(userId, eventId);
	const payload = updates || {};
	const updateKeys = Object.keys(payload);

	if (updateKeys.length === 0) {
		throw createServiceError("No fields provided for update", 400);
	}

	// lock form schema after first registration is received
	const hasRegistration = event.registrationCount > 0;
	if (hasRegistration && Object.prototype.hasOwnProperty.call(payload, "formSchema")) {
		throw createServiceError("formSchema is locked after first registration", 409);
	}

	const immutableFields = new Set(["organizerId", "registrationCount", "_id", "createdAt", "updatedAt"]);
	const hasImmutableUpdate = updateKeys.some((key) => immutableFields.has(key));
	if (hasImmutableUpdate) {
		throw createServiceError("Attempt to update immutable event fields", 400);
	}

	// draft: free edits
	if (event.status === "draft") {
		const updatedEvent = await Event.findByIdAndUpdate(
			eventId,
			{ $set: payload },
			{ new: true, runValidators: true },
		);
		return updatedEvent;
	}

	// published: allow controlled edits only
	if (event.status === "published") {
		const allowedPublishedFields = new Set([
			"description",
			"registrationDeadline",
			"registrationLimit",
			"registrationOpen",
			"status",
		]);
		const hasDisallowedField = updateKeys.some((key) => !allowedPublishedFields.has(key));
		if (hasDisallowedField) {
			throw createServiceError("Only description, registrationDeadline, registrationLimit, registrationOpen, status can be updated for published events", 400);
		}

		if (Object.prototype.hasOwnProperty.call(payload, "registrationDeadline")) {
			const newDeadline = new Date(payload.registrationDeadline);
			if (Number.isNaN(newDeadline.getTime())) {
				throw createServiceError("registrationDeadline must be a valid date", 400);
			}
			if (newDeadline <= new Date(event.registrationDeadline)) {
				throw createServiceError("registrationDeadline can only be extended for published events", 400);
			}
		}

		if (Object.prototype.hasOwnProperty.call(payload, "registrationLimit")) {
			const newLimit = Number(payload.registrationLimit);
			if (Number.isNaN(newLimit) || newLimit < 0) {
				throw createServiceError("registrationLimit must be a valid non-negative number", 400);
			}
			if (newLimit !== 0 && newLimit < event.registrationLimit) {
				throw createServiceError("registrationLimit can only be increased for published events", 400);
			}
		}

		const updatedEvent = await Event.findByIdAndUpdate(
			eventId,
			{ $set: payload },
			{ new: true, runValidators: true },
		);
		return updatedEvent;
	}

	// completed/cancelled: only status changes allowed
	if (["completed", "cancelled"].includes(event.status)) {
		if (updateKeys.length !== 1 || !Object.prototype.hasOwnProperty.call(payload, "status")) {
			throw createServiceError("Only status updates are allowed for completed or cancelled events", 400);
		}

		const updatedEvent = await Event.findByIdAndUpdate(
			eventId,
			{ $set: { status: payload.status } },
			{ new: true, runValidators: true },
		);
		return updatedEvent;
	}

	throw createServiceError("Unsupported event status for update", 400);
};

// get all the registrations for the given event Id
const getEventAnalytics = async (userId, eventId) => {
	const event = await getOrganizerOwnedEvent(userId, eventId);

	// 3 independent db calls to get the total people registered, attended, cancelled
	const [totalRegistrations, attendedCount, cancelledCount] = await Promise.all([
		Registration.countDocuments({ eventId: event._id }),
		Registration.countDocuments({ eventId: event._id, status: "attended" }),
		Registration.countDocuments({ eventId: event._id, status: "cancelled" }),
	]);

	// calculate the total revenue generated from registration fees
	const registrationRevenue = (event.registrationFee || 0) * (totalRegistrations - cancelledCount);

	// add revenue from approved merchandise orders
	const merchRevenueResult = await MerchOrder.aggregate([
		{ $match: { eventId: event._id, status: "approved" } },
		{ $group: { _id: null, total: { $sum: "$totalAmount" } } },
	]);
	const merchRevenue = merchRevenueResult.length > 0 ? merchRevenueResult[0].total : 0;
	const estimatedRevenue = registrationRevenue + merchRevenue;

	// if a team event then calculate the total teams registered and then the teams that completed
	const teamCompletion = event.isTeamEvent
		? await TeamRegistration.find({ eventId: event._id }).then((teams) => {
			const completedTeams = teams.filter((team) => team.status === "completed").length;
			return {
				completedTeams,
				totalTeams: teams.length,
			};
		})
		: null;

	return {
		event,
		analytics: {
			totalRegistrations,
			attendedCount,
			cancelledCount,
			estimatedRevenue,
			teamCompletion,
		},
	};
};

// get the event participants 
const getEventParticipants = async (userId, eventId, queryParams) => {
	// make sure event is owned by the organizer
	await getOrganizerOwnedEvent(userId, eventId);
	const { search, status } = queryParams || {};

	// build the query object
	const query = { eventId };
	if (status) {
		query.status = status;
	}

	// get all the registrations and then using the userId get the firstName, lastName, email
	let registrations = await Registration.find(query)
		.populate("userId", "firstName lastName email")
		.sort({ createdAt: -1 }); // sort by most recent registration

	// now filter the registrations based on the search filter
	if (search && search.trim().length > 0) {
		const safeSearch = search.trim().toLowerCase();
		registrations = registrations.filter((registration) => {
			const firstName = registration.userId?.firstName?.toLowerCase() || "";
			const lastName = registration.userId?.lastName?.toLowerCase() || "";
			const email = registration.userId?.email?.toLowerCase() || "";
			return firstName.includes(safeSearch)
				|| lastName.includes(safeSearch)
				|| email.includes(safeSearch);
		});
	}

	return registrations.map((registration) => ({
		registrationId: registration._id,
		name: `${registration.userId?.firstName || ""} ${registration.userId?.lastName || ""}`.trim(),
		email: registration.userId?.email || "",
		status: registration.status,
		registrationDate: registration.createdAt,
		teamName: registration.teamName || "",
		teamSize: 1 + (registration.teamMembers?.length || 0),
		attendance: registration.status === "attended",
		payment: "N/A",
	}));
};

// get the participants for the event using the prev method 
const getEventParticipantsCsv = async (userId, eventId, queryParams) => {
	const participants = await getEventParticipants(userId, eventId, queryParams);
	const header = [
		"Registration ID",
		"Name",
		"Email",
		"Status",
		"Registration Date",
		"Team Name",
		"Team Size",
		"Attendance",
		"Payment",
	];

	// creat the rows 
	const rows = participants.map((participant) => ([
		participant.registrationId,
		participant.name,
		participant.email,
		participant.status,
		new Date(participant.registrationDate).toISOString(),
		participant.teamName,
		participant.teamSize,
		participant.attendance ? "Yes" : "No",
		participant.payment,
	]));

	// add the header and spread the rows
	const csv = [header, ...rows]
		.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
		.join("\n");

	return csv;
};

// get team registrations for organizer-owned team events
const getEventTeams = async (userId, eventId) => {
	const event = await getOrganizerOwnedEvent(userId, eventId);
	if (!event.isTeamEvent) {
		return [];
	}

	const teams = await TeamRegistration.find({ eventId })
		.populate("leaderId", "firstName lastName email")
		.populate("members.userId", "firstName lastName email")
		.sort({ createdAt: -1 });

	return teams.map((team) => ({
		teamId: team._id,
		teamName: team.teamName,
		inviteCode: team.inviteCode,
		status: team.status,
		teamSize: team.teamSize,
		memberCount: team.members.filter((member) => member.status === "accepted").length,
		leader: {
			name: `${team.leaderId?.firstName || ""} ${team.leaderId?.lastName || ""}`.trim(),
			email: team.leaderId?.email || "",
		},
		invites: (team.invites || []).map((invite) => ({
			email: invite.email,
			status: invite.status,
		})),
	}));
};

// get merchandise orders for organizer-owned merchandise event
const getEventMerchOrders = async (userId, eventId, queryParams) => {
	// get the event using the event id and user id and validate
	const event = await getOrganizerOwnedEvent(userId, eventId);
	if (event.eventType !== "merchandise") {
		throw createServiceError("This event does not support merchandise orders", 400);
	}

	// create the query object with the eventId and status from the params
	const query = { eventId: event._id };
	if (queryParams?.status) {
		query.status = queryParams.status;
	}

	// populate the details using the userId and reviewedBy
	const orders = await MerchOrder.find(query)
		.populate("userId", "firstName lastName email")
		.populate("reviewedBy", "firstName lastName email")
		.sort({ createdAt: -1 });

	// return details
	return orders.map((order) => ({
		orderId: order._id,
		participant: {
			name: `${order.userId?.firstName || ""} ${order.userId?.lastName || ""}`.trim(),
			email: order.userId?.email || "",
		},
		itemName: order.itemName,
		variant: order.variant || "",
		quantity: order.quantity,
		unitPrice: order.unitPrice,
		totalAmount: order.totalAmount,
		paymentProofUrl: order.paymentProofUrl || "",
		status: order.status,
		reviewComment: order.reviewComment || "",
		reviewedBy: order.reviewedBy
			? {
				name: `${order.reviewedBy.firstName || ""} ${order.reviewedBy.lastName || ""}`.trim(),
				email: order.reviewedBy.email || "",
			}
			: null,
		reviewedAt: order.reviewedAt || null,
		createdAt: order.createdAt,
	}));
};

// approve or reject a merchandise order
const reviewMerchOrder = async (userId, eventId, orderId, payload) => {
	// check if orderId is valid
	if (!mongoose.Types.ObjectId.isValid(orderId)) {
		throw createServiceError("Invalid order id", 400);
	}
	// validate event with eventId and userId
	const event = await getOrganizerOwnedEvent(userId, eventId);
	if (event.eventType !== "merchandise") {
		throw createServiceError("This event does not support merchandise orders", 400);
	}

	// review the action and see if approve or reject
	const action = payload?.action;
	const reviewComment = typeof payload?.comment === "string" ? payload.comment.trim() : "";
	if (!["approve", "reject"].includes(action)) {
		throw createServiceError("action must be either approve or reject", 400);
	}

	// find the merch order with the orderId and eventId and check if pending_approval
	const order = await MerchOrder.findOne({ _id: orderId, eventId: event._id });
	if (!order) {
		throw createServiceError("Order not found", 404);
	}
	if (order.status !== "pending_approval") {
		throw createServiceError("Only pending approval orders can be reviewed", 409);
	}

	// if the order status ir rejected then set the status field and return
	if (action === "reject") {
		order.status = "rejected";
		order.reviewComment = reviewComment;
		order.reviewedBy = userId;
		order.reviewedAt = new Date();
		await order.save();
		return order;
	}

	// check if the order items are present in the event merch items
	const merchItem = (event.merchItems || []).find((item) => item.name === order.itemName);
	if (!merchItem) {
		throw createServiceError("Merchandise item no longer exists", 409);
	}

	if ((merchItem.stock || 0) < order.quantity) {
		throw createServiceError("Insufficient stock for approval", 409);
	}

	// reduce the order quantity and save event 
	merchItem.stock -= order.quantity;
	await event.save();

	order.status = "approved";
	order.reviewComment = reviewComment;
	order.reviewedBy = userId;
	order.reviewedAt = new Date();
	await order.save();

	await Registration.findOneAndUpdate(
		{ eventId: event._id, userId: order.userId },
		{
			$setOnInsert: {
				eventId: event._id,
				userId: order.userId,
				status: "registered",
				...buildTicketPayload(event._id, order.userId),
			},
		},
		{ upsert: true, new: false, setDefaultsOnInsert: true },
	);

	const activeRegistrationCount = await Registration.countDocuments({
		eventId: event._id,
		status: { $ne: "cancelled" },
	});
	await Event.findByIdAndUpdate(event._id, { $set: { registrationCount: activeRegistrationCount } });

	// send merchandise approval confirmation with ticket details
	const participantUser = await User.findById(order.userId).select("firstName email");
	const participantRegistration = await Registration.findOne({ eventId: event._id, userId: order.userId }).select("ticketId qrCodeUrl");
	if (participantUser?.email) {
		await sendEmailNotification({
			to: participantUser.email,
			subject: `Merchandise Order Approved: ${event.name}`,
			body: `Hi ${participantUser.firstName || "Participant"}, your order has been approved. Ticket ID: ${participantRegistration?.ticketId || "N/A"}. QR: ${participantRegistration?.qrCodeUrl || "N/A"}`,
		});
	}

	return order;
};

// get the completed events summary
const getOrganizerAnalyticsSummary = async (userId) => {
	const organizerProfileId = await getOrganizerProfileId(userId);
	const completedEvents = await Event.find({
		organizerId: organizerProfileId,
		status: "completed",
	}).select("_id name registrationFee");

	const completedEventIds = completedEvents.map((event) => event._id);
	// get the total events count and the registrations 
	const [totalEvents, activeEvents, totalRegistrations, attendedCount] = await Promise.all([
		Event.countDocuments({ organizerId: organizerProfileId }),
		Event.countDocuments({ organizerId: organizerProfileId, status: "published" }),
		Registration.countDocuments({ eventId: { $in: completedEventIds } }),
		Registration.countDocuments({ eventId: { $in: completedEventIds }, status: "attended" }),
	]);

	// get the events which are not cancelled and group by event id and accumulate the counts
	const registrationsByEvent = await Registration.aggregate([
		{ $match: { eventId: { $in: completedEventIds }, status: { $ne: "cancelled" } } },
		{ $group: { _id: "$eventId", count: { $sum: 1 } } },
	]);
	// calculate the revenue for completed events only
	const regMap = new Map(registrationsByEvent.map((item) => [item._id.toString(), item.count]));
	const registrationRevenue = completedEvents.reduce((sum, event) => {
		const count = regMap.get(event._id.toString()) || 0;
		return sum + (event.registrationFee || 0) * count;
	}, 0);

	// add revenue from approved merchandise orders across completed events
	const merchRevenueResult = await MerchOrder.aggregate([
		{ $match: { eventId: { $in: completedEventIds }, status: "approved" } },
		{ $group: { _id: null, total: { $sum: "$totalAmount" } } },
	]);
	const merchRevenue = merchRevenueResult.length > 0 ? merchRevenueResult[0].total : 0;
	const estimatedRevenue = registrationRevenue + merchRevenue;
	const eventBreakdown = completedEvents.map((event) => {
		const registrations = regMap.get(event._id.toString()) || 0;
		return {
			eventId: event._id,
			eventName: event.name || "",
			registrations,
			estimatedRevenue: registrations * (event.registrationFee || 0),
		};
	});

	return {
		totalEvents,
		activeEvents,
		completedEvents: completedEvents.length,
		totalRegistrations,
		attendedCount,
		estimatedRevenue,
		eventBreakdown,
	};
};

const requestPasswordReset = async (userId, payload) => {
	// send a reason for the password reset
	const { reason } = payload || {};
	if (!reason || reason.trim().length === 0) {
		throw createServiceError("Reason is required", 400);
	}

	const organizerProfileId = await getOrganizerProfileId(userId);

	// prevent duplicate pending requests for the same organizer account
	const pendingRequest = await OrganizerPasswordResetRequest.findOne({
		organizerId: organizerProfileId,
		organizerAccountId: userId,
		status: "pending",
	});
	if (pendingRequest) {
		throw createServiceError("A pending password reset request already exists", 409);
	}

	// create a new request and append it to the database
	const newRequest = await OrganizerPasswordResetRequest.create({
		organizerId: organizerProfileId,
		organizerAccountId: userId,
		reason: reason.trim(),
		requestedBy: userId,
		status: "pending",
	});

	return newRequest;
};

const getMyPasswordResetRequests = async (userId) => {
	// get the organizer's userId 
	const organizerProfileId = await getOrganizerProfileId(userId);

	// from the password reset storage get the the requests and then return it
	const requests = await OrganizerPasswordResetRequest.find({
		organizerId: organizerProfileId,
		organizerAccountId: userId,
	})
		.sort({ createdAt: -1 })
		.populate("reviewedBy", "firstName lastName email");

	return requests;
};

module.exports = {
	createEventForOrganizer,
	getOrganizerProfile,
	updateOrganizerProfile,
	deleteEventForOrganizer,
	getMyEvents,
	getOngoingEvents,
	updateEventForOrganizer,
	getEventAnalytics,
	getEventParticipants,
	getEventParticipantsCsv,
	getEventTeams,
	getEventMerchOrders,
	reviewMerchOrder,
	getOrganizerAnalyticsSummary,
	requestPasswordReset,
	getMyPasswordResetRequests,
};
