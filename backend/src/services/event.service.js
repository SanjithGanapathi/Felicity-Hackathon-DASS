const Event = require("../models/Event");
const User = require("../models/User");
const Organizer = require("../models/Organizer");
const Registration = require("../models/Registration");
const TeamRegistration = require("../models/TeamRegistration");
const { sendEmailNotification } = require("./notification.service");
const crypto = require("crypto");
const mongoose = require("mongoose");

const createServiceError = (message, statusCode) => {
	const err = new Error(message);
	err.statusCode = statusCode;
	return err;
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// validate mongodb object ids before db calls to avoid cast errors
const ensureValidObjectId = (value, fieldName) => {
	if (!mongoose.Types.ObjectId.isValid(value)) {
		throw createServiceError(`Invalid ${fieldName}`, 400);
	}
};

const queryEvent = async (queryParams) => {
	const { search, type, status, organizerId, eligibility, startDate, endDate, followedOnly, userId, page, limit } = queryParams;

	// declare a query object 
	const query = {};

	// search by event and organizer names using partial matching
	if (search && search.trim().length > 0) {
		// replace certain values for regex and make it case insensitive
		const normalizedSearch = search.trim();
		const safeSearch = escapeRegex(normalizedSearch);
		const searchRegex = new RegExp(safeSearch, "i");
		const searchTokens = normalizedSearch
			.split(/\s+/)
			.map((token) => token.trim())
			.filter(Boolean)
			.map((token) => new RegExp(escapeRegex(token), "i"));

		// find matching organizers and map them to their ids
		const organizerMatchQuery = {
			$or: [
				{ name: searchRegex },
				...searchTokens.map((tokenRegex) => ({ name: tokenRegex })),
			],
		};
		const organizerMatches = await Organizer.find(organizerMatchQuery).select("_id");
		const organizerIds = organizerMatches.map((organizer) => organizer._id);

		// check if name/description/tags match and add them
		const fuzzyTokenConditions = searchTokens.flatMap((tokenRegex) => ([
			{ name: tokenRegex },
			{ description: tokenRegex },
			{ tags: tokenRegex },
		]));

		query.$or = [
			{ name: searchRegex },
			{ description: searchRegex },
			{ tags: searchRegex },
			...fuzzyTokenConditions,
		];

		// or if organizer ids match then add them
		if (organizerIds.length > 0) {
			query.$or.push({ organizerId: { $in: organizerIds } });
		}
	}
	// set eventType, status etc from the query
	if (type) query.eventType = type;
	if (status) query.status = status;
	if (organizerId) query.organizerId = organizerId;
	if (eligibility) query.eligibility = eligibility;

	// apply followed organizer filter for authenticated participant browsing
	if (followedOnly === "true" || followedOnly === true) {
		// verify if user Id is present
		if (!userId) {
			throw createServiceError("Authentication required for followed organizer filter", 401);
		}

		// get the user's following list
		const user = await User.findById(userId).select("participantProfile.following");
		if (!user) {
			throw createServiceError("User not found", 404);
		}

		// then return events based on it
		const followedOrganizerIds = user.participantProfile?.following || [];
		if (followedOrganizerIds.length === 0) {
			return { events: [], total: 0, page: 1, pages: 0 };
		}

		if (organizerId) {
			const isFollowedOrganizer = followedOrganizerIds.some(
				(id) => id.toString() === organizerId.toString()
			);
			if (!isFollowedOrganizer) {
				return { events: [], total: 0, page: 1, pages: 0 };
			}
		} else {
			query.organizerId = { $in: followedOrganizerIds };
		}
	}

	// date filter
	if (startDate || endDate) {
		if (startDate && Number.isNaN(new Date(startDate).getTime())) {
			throw createServiceError("Invalid startDate", 400);
		}
		if (endDate && Number.isNaN(new Date(endDate).getTime())) {
			throw createServiceError("Invalid endDate", 400);
		}

		query.startDate = {};
		if (startDate) query.startDate.$gte = new Date(startDate);
		if (endDate) query.startDate.$lte = new Date(endDate);
		if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
			throw createServiceError("startDate cannot be after endDate", 400);
		}
	}

	// filter by status (default to published)
	query.status = status || "published";
	// set no of elements to view in a page
	const pageNum = parseInt(page) || 1;
	const limitNum = parseInt(limit) || 10;

	if (page && pageNum < 1) {
		throw createServiceError("page must be at least 1", 400);
	}
	if (limit && (limitNum < 1 || limitNum > 100)) {
		throw createServiceError("limit must be between 1 and 100", 400);
	}

	const skip = (pageNum - 1) * limitNum;

	// apply preference-based ordering when participant interests/following exist
	if (userId) {
		// first fetch the user's preferences list that is their interests and followed organizers/clubs
		const user = await User.findById(userId).select("role participantProfile.interests participantProfile.following");
		const interestSet = new Set((user?.participantProfile?.interests || []).map((item) => item.toLowerCase()));
		const followingSet = new Set((user?.participantProfile?.following || []).map((id) => id.toString()));
		const hasPreferences = user?.role === "participant" && (interestSet.size > 0 || followingSet.size > 0);

		// if they have preferences start ranking them
		if (hasPreferences) {
			const matchedEvents = await Event.find(query)
				.populate("organizerId", "name category")
				.sort({ startDate: 1 });

			// add scores
			// Rules are as followws
			// if the user follows them then +3
			// if the tags matched then +2
			// if scores still match sort by date 
			const scoredEvents = matchedEvents
				.map((event) => {
					let score = 0;

					if (event.organizerId?._id && followingSet.has(event.organizerId._id.toString())) {
						score += 3;
					}

					const matchedTags = (event.tags || []).reduce((count, tag) => {
						if (typeof tag === "string" && interestSet.has(tag.toLowerCase())) {
							return count + 1;
						}
						return count;
					}, 0);
					score += matchedTags * 2;

					return { event, score };
				})
				.sort((left, right) => {
					if (right.score !== left.score) {
						return right.score - left.score;
					}
					const leftDate = left.event.startDate ? new Date(left.event.startDate).getTime() : Number.MAX_SAFE_INTEGER;
					const rightDate = right.event.startDate ? new Date(right.event.startDate).getTime() : Number.MAX_SAFE_INTEGER;
					return leftDate - rightDate;
				});

			const total = scoredEvents.length;
			const events = scoredEvents.slice(skip, skip + limitNum).map((item) => item.event);
			return { events, total, page: pageNum, pages: Math.ceil(total / limitNum) };
		}
	}

	// default db query when no preferences are available
	const events = await Event.find(query).populate("organizerId", "name category")
		.sort({ startDate: 1 })
		.skip(skip)
		.limit(limitNum);
	const total = await Event.countDocuments(query);

	return { events, total, page: pageNum, pages: Math.ceil(total / limitNum) };
};

const queryEventById = async (eventId) => {
	ensureValidObjectId(eventId, "event id");
	const event = await Event.findById(eventId).populate("organizerId", "name contactEmail description");

	if (!event) {
		throw createServiceError("Event not found", 404);
	}

	return event;
};

const buildTicketPayload = (eventId, userId) => {
	const ticketId = `TKT-${String(eventId).slice(-6).toUpperCase()}-${String(userId).slice(-6).toUpperCase()}-${Date.now().toString().slice(-6)}`;
	const qrData = JSON.stringify({ ticketId, eventId: String(eventId), userId: String(userId) });
	const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;
	return { ticketId, qrCodeUrl };
};

const registerUserForEvent = async (eventId, userId, payload = {}) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(userId, "user id");
	const event = await Event.findById(eventId);
	if (!event) {
		throw createServiceError("Event not found", 404);
	}
	if (event.isTeamEvent) {
		throw createServiceError("This is a team event. Use team registration workflow", 400);
	}

	const user = await User.findById(userId);
	if (!user) {
		throw createServiceError("User not found", 404);
	}

	if (event.eligibility === "iiit_only" && user.participantProfile?.participantType !== "IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}
	if (event.eligibility === "non_iiit_only" && user.participantProfile?.participantType !== "Non-IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}

	if (new Date() > event.registrationDeadline) {
		throw createServiceError("Registration deadline has passed", 400);
	}

	if (event.registrationLimit > 0 && (event.registrationCount >= event.registrationLimit)) {
		throw createServiceError("Event is fully booked", 400);
	}

	if (event.status !== "published") {
		throw createServiceError("Event is not open for registration", 400);
	}
	if (event.registrationOpen === false) {
		throw createServiceError("Registrations are closed for this event", 400);
	}

	const regExists = await Registration.findOne({ eventId, userId });
	if (regExists) {
		throw createServiceError("You are already registered for this event", 400);
	}

	// validate dynamic form responses for normal events when form schema is configured
	const formResponses = Array.isArray(payload.formResponses) ? payload.formResponses : [];
	if (event.eventType === "normal" && Array.isArray(event.formSchema) && event.formSchema.length > 0) {
		const answersByQuestion = new Map(
			formResponses
				.filter((response) => response && typeof response.question === "string")
				.map((response) => [response.question, response.answer]),
		);

		const missingRequiredField = event.formSchema.find((field) => {
			if (!field.required || !field.label) {
				return false;
			}
			const answer = answersByQuestion.get(field.label);
			if (answer === undefined || answer === null) {
				return true;
			}
			if (typeof answer === "string" && answer.trim().length === 0) {
				return true;
			}
			if (Array.isArray(answer) && answer.length === 0) {
				return true;
			}
			return false;
		});

		if (missingRequiredField) {
			throw createServiceError(`Missing required form field: ${missingRequiredField.label}`, 400);
		}
	}

	const { ticketId, qrCodeUrl } = buildTicketPayload(eventId, userId);

	const newRegistration = new Registration({
		eventId,
		userId,
		status: "registered",
		formResponses,
		ticketId,
		qrCodeUrl,
	});

	await newRegistration.save();

	event.registrationCount += 1;
	await event.save();

	// send registration ticket details to participant email after successful registration
	await sendEmailNotification({
		to: user.email,
		subject: `Registration Confirmed: ${event.name}`,
		body: `Hi ${user.firstName || "Participant"}, your ticket ID is ${ticketId}. QR: ${qrCodeUrl}`,
	});

	return newRegistration;
};

// validate if the team event is available
const validateTeamEventAvailability = async (eventId) => {
	ensureValidObjectId(eventId, "event id");
	const event = await Event.findById(eventId);
	if (!event) {
		throw createServiceError("Event not found", 404);
	}
	if (!event.isTeamEvent) {
		throw createServiceError("This event does not support team registration", 400);
	}
	if (event.status !== "published") {
		throw createServiceError("Event is not open for registration", 400);
	}
	if (event.registrationOpen === false) {
		throw createServiceError("Registrations are closed for this event", 400);
	}
	if (new Date() > event.registrationDeadline) {
		throw createServiceError("Registration deadline has passed", 400);
	}

	return event;
};

// validate if event exists and supports team registration for read-only flows
const validateTeamEventType = async (eventId) => {
	ensureValidObjectId(eventId, "event id");
	const event = await Event.findById(eventId);
	if (!event) {
		throw createServiceError("Event not found", 404);
	}
	if (!event.isTeamEvent) {
		throw createServiceError("This event does not support team registration", 400);
	}

	return event;
};

// func to create an invite code for modularity
const createInviteCode = () => {
	return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// 
const getActiveTeamForUser = async (eventId, userId) => {
	return TeamRegistration.findOne({
		eventId,
		status: "pending",
		"members.userId": userId,
	});
};

// check if the user is registered for the event
const hasIndividualRegistration = async (eventId, userId) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(userId, "user id");
	const registration = await Registration.findOne({ eventId, userId, status: { $ne: "cancelled" } });
	return Boolean(registration);
};

// create individual registrations for the members who accepted the invite
const createMemberRegistrations = async (team, eventId) => {
	// get the set of members who accepted the invite and map them to their userIds
	const acceptedMemberIds = team.members
		.filter((member) => member.status === "accepted")
		.map((member) => member.userId);

	// now using an arrow function create the registrations for the ones who accepted and if the registrations do not exist
	// add all the requests to the db 
	const teamFormResponses = Array.isArray(team.formResponses) ? team.formResponses : [];
	const operations = acceptedMemberIds.map((memberId) => ({
		...buildTicketPayload(eventId, memberId),
		memberId,
	}));
	const bulkOperations = operations.map(({ ticketId, qrCodeUrl, memberId }) => ({
		updateOne: {
			filter: { eventId, userId: memberId },
			update: {
				$setOnInsert: {
					eventId,
					userId: memberId,
					status: "registered",
					teamName: team.teamName,
					teamMembers: acceptedMemberIds.filter((id) => id.toString() !== memberId.toString()),
					formResponses: teamFormResponses,
					ticketId,
					qrCodeUrl,
				},
			},
			upsert: true,
		},
	}));

	await Registration.bulkWrite(bulkOperations, { ordered: false });
};

// check if team is full all members accepted and registered then create and save the team
const finalizeTeamIfComplete = async (teamId) => {
	ensureValidObjectId(teamId, "team id");
	// get the team 
	const team = await TeamRegistration.findById(teamId);
	if (!team || team.status === "completed") {
		return team;
	}

	// check the no of people accepted the invite and no invite is left pending
	const acceptedCount = team.members.filter((member) => member.status === "accepted").length;
	const allInvitesSettled = team.invites.every((invite) => invite.status !== "pending");
	if (acceptedCount === team.teamSize && allInvitesSettled) {
		// make sure that the event is present and hasn't exceeded the reg limit
		const event = await Event.findById(team.eventId);
		if (!event) {
			throw createServiceError("Event not found", 404);
		}
		// count active registrations and only allow capacity for new team members
		const acceptedMemberIds = team.members
			.filter((member) => member.status === "accepted")
			.map((member) => member.userId);
		const existingTeamRegistrations = await Registration.countDocuments({
			eventId: team.eventId,
			userId: { $in: acceptedMemberIds },
			status: { $ne: "cancelled" },
		});
		const activeRegistrationCount = await Registration.countDocuments({
			eventId: team.eventId,
			status: { $ne: "cancelled" },
		});
		const newRegistrationsNeeded = acceptedCount - existingTeamRegistrations;

		if (event.registrationLimit > 0 && activeRegistrationCount + newRegistrationsNeeded > event.registrationLimit) {
			throw createServiceError("Event is fully booked", 400);
		}

		// mark completion atomically so only one request finalizes team
		const completionUpdate = await TeamRegistration.updateOne(
			{ _id: teamId, status: "pending" },
			{ $set: { status: "completed", completedAt: new Date() } },
		);
		if (completionUpdate.modifiedCount === 0) {
			return TeamRegistration.findById(teamId);
		}

		// create registrations idempotently and then sync the event registration count
		await createMemberRegistrations(team, team.eventId);
		const latestActiveRegistrationCount = await Registration.countDocuments({
			eventId: team.eventId,
			status: { $ne: "cancelled" },
		});
		await Event.findByIdAndUpdate(team.eventId, {
			$set: { registrationCount: latestActiveRegistrationCount },
		});
	}

	return TeamRegistration.findById(teamId);
};

// flow that a leader creates event and sends out invites
const createHackathonTeam = async (eventId, leaderId, payload) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(leaderId, "user id");
	// check if a team event and still open
	const event = await validateTeamEventAvailability(eventId);

	// check if it is the leader 
	const leader = await User.findById(leaderId).select("email role participantProfile.participantType");
	if (!leader || leader.role !== "participant") {
		throw createServiceError("Participant not found", 404);
	}

	// check eligibility based on participant type
	if (event.eligibility === "iiit_only" && leader.participantProfile?.participantType !== "IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}
	if (event.eligibility === "non_iiit_only" && leader.participantProfile?.participantType !== "Non-IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}

	// check if the leader is already registered for the event
	if (await hasIndividualRegistration(eventId, leaderId)) {
		throw createServiceError("You are already registered for this event", 400);
	}
	// check if the user is already part of another team so send a conflict code 409 with another resource
	if (await getActiveTeamForUser(eventId, leaderId)) {
		throw createServiceError("You already belong to another team for this event", 409);
	}

	// get the payload
	const { teamName, teamSize, inviteEmails } = payload || {};
	if (!teamName || teamName.trim().length === 0) {
		throw createServiceError("teamName is required", 400);
	}

	const requestedTeamSize = Number(teamSize);
	if (Number.isNaN(requestedTeamSize)) {
		throw createServiceError("teamSize must be a valid number", 400);
	}
	// check if the reqTeamSize is within limits
	if (requestedTeamSize < (event.minTeamSize || 2) || requestedTeamSize > (event.maxTeamSize || 5)) {
		throw createServiceError(`teamSize must be between ${event.minTeamSize || 2} and ${event.maxTeamSize || 5}`, 400);
	}

	// check for event regCount limit
	if (event.registrationLimit > 0 && event.registrationCount + requestedTeamSize > event.registrationLimit) {
		throw createServiceError("Event is fully booked", 400);
	}

	// remove duplicates in the invite emails and the leaders email
	const normalizedInviteEmails = Array.isArray(inviteEmails)
		? Array.from(
			new Set(
				inviteEmails
					.filter((email) => typeof email === "string")
					.map((email) => email.trim().toLowerCase())
					.filter((email) => email.length > 0 && email !== leader.email),
			),
		)
		: [];

	// if the no of invites to be sent is greater than team size excluding leader then issue
	if (normalizedInviteEmails.length > requestedTeamSize - 1) {
		throw createServiceError("Invite list cannot exceed team size", 400);
	}

	// validate the users you have to send invite to 
	const inviteUsers = await User.find({ email: { $in: normalizedInviteEmails }, role: "participant" }).select("_id email");
	const foundInviteEmails = new Set(inviteUsers.map((user) => user.email.toLowerCase()));
	const invalidInviteEmails = normalizedInviteEmails.filter((email) => !foundInviteEmails.has(email));
	if (invalidInviteEmails.length > 0) {
		throw createServiceError(`Invalid participant emails: ${invalidInviteEmails.join(", ")}`, 400);
	}

	// check if the user is already in another pending team to avoid conflicts and then throw error
	const conflictingMember = await TeamRegistration.findOne({
		eventId,
		status: "pending",
		"members.userId": { $in: inviteUsers.map((user) => user._id) },
	});
	if (conflictingMember) {
		throw createServiceError("One or more invited users already belong to another team for this event", 409);
	}

	// make sure that the invited users are not already registered for the event
	const alreadyRegisteredInvite = await Registration.findOne({
		eventId,
		userId: { $in: inviteUsers.map((user) => user._id) },
		status: { $ne: "cancelled" },
	});
	if (alreadyRegisteredInvite) {
		throw createServiceError("One or more invited users are already registered for this event", 409);
	}

	// create the invite code with retries to handle rare collisions
	let team = null;
	let attempt = 0;
	while (!team && attempt < 5) {
		attempt += 1;
		try {
			const inviteCode = createInviteCode();
			// validate and collect form responses for team events with form schema
			const formResponses = Array.isArray(payload.formResponses) ? payload.formResponses : [];
			if (Array.isArray(event.formSchema) && event.formSchema.length > 0) {
				const answersByQuestion = new Map(
					formResponses
						.filter((response) => response && typeof response.question === "string")
						.map((response) => [response.question, response.answer]),
				);
				const missingRequiredField = event.formSchema.find((field) => {
					if (!field.required || !field.label) {
						return false;
					}
					const answer = answersByQuestion.get(field.label);
					if (answer === undefined || answer === null) {
						return true;
					}
					if (typeof answer === "string" && answer.trim().length === 0) {
						return true;
					}
					if (Array.isArray(answer) && answer.length === 0) {
						return true;
					}
					return false;
				});
				if (missingRequiredField) {
					throw createServiceError(`Missing required form field: ${missingRequiredField.label}`, 400);
				}
			}

			team = await TeamRegistration.create({
				eventId,
				leaderId,
				teamName: teamName.trim(),
				teamSize: requestedTeamSize,
				inviteCode,
				members: [{ userId: leaderId, status: "accepted", joinedAt: new Date() }],
				invites: normalizedInviteEmails.map((email) => ({ email, status: "pending" })),
				formResponses,
				status: "pending",
			});
		} catch (err) {
			if (err?.code !== 11000) {
				throw err;
			}
		}
	}
	if (!team) {
		throw createServiceError("Could not generate invite code. Please try again", 500);
	}

	// get the team info and return the populated team with the necessary details fetched from other schemas
	const populatedTeam = await TeamRegistration.findById(team._id)
		.populate("leaderId", "firstName lastName email")
		.populate("members.userId", "firstName lastName email");
	return populatedTeam;
};

// get the team that the user belongs to for an event
const getMyTeamForEvent = async (eventId, userId) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(userId, "user id");
	// check if the team event is actually present
	await validateTeamEventType(eventId);
	const user = await User.findById(userId).select("email");
	if (!user) {
		throw createServiceError("User not found", 404);
	}

	// find a a registration with the userId and eventId and then if found populate the details and send
	const teamRecord = await TeamRegistration.findOne({
		eventId,
		$or: [
			{ "members.userId": userId },
			{ "invites.email": user.email.toLowerCase() },
		],
	})
		.populate("leaderId", "firstName lastName email")
		.populate("members.userId", "firstName lastName email")
		.sort({ createdAt: -1 });

	if (teamRecord && teamRecord.leaderId && teamRecord.leaderId._id.toString() !== userId.toString()) {
		const team = teamRecord.toObject();
		delete team.inviteCode;
		return team;
	}

	return teamRecord;
};

// method for an user to join the team using the invite code
const joinHackathonTeamByCode = async (eventId, userId, payload) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(userId, "user id");
	// validate the team event
	const event = await validateTeamEventAvailability(eventId);
	const user = await User.findById(userId).select("email role participantProfile.participantType");
	if (!user || user.role !== "participant") {
		throw createServiceError("Participant not found", 404);
	}

	// check eligibility based on participant type
	if (event.eligibility === "iiit_only" && user.participantProfile?.participantType !== "IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}
	if (event.eligibility === "non_iiit_only" && user.participantProfile?.participantType !== "Non-IIIT") {
		throw createServiceError("You are not eligible for this event", 400);
	}

	// prevent double registration or registration for another team
	if (await hasIndividualRegistration(eventId, userId)) {
		throw createServiceError("You are already registered for this event", 400);
	}
	// check if payload has invite code
	const inviteCode = payload?.inviteCode?.trim()?.toUpperCase();
	if (!inviteCode) {
		throw createServiceError("inviteCode is required", 400);
	}

	// check if the user has a pending invite code to be accepted 
	const team = await TeamRegistration.findOne({ eventId, inviteCode, status: "pending" });
	if (!team) {
		throw createServiceError("Invalid or expired invite code", 404);
	}

	// allow validating same-team repeat joins and block joining other active teams
	const activeTeam = await getActiveTeamForUser(eventId, userId);
	if (activeTeam && activeTeam._id.toString() !== team._id.toString()) {
		throw createServiceError("You already belong to another team for this event", 409);
	}
	if (team.members.some((member) => member.userId.toString() === userId.toString())) {
		throw createServiceError("You are already part of this team", 400);
	}

	// check if the team is already full
	const acceptedCount = team.members.filter((member) => member.status === "accepted").length;
	if (acceptedCount >= team.teamSize) {
		throw createServiceError("Team is already full", 400);
	}

	// check if the team invite is valid
	const inviteIndex = team.invites.findIndex((invite) => invite.email === user.email.toLowerCase());
	if (team.invites.length > 0 && inviteIndex === -1) {
		throw createServiceError("You are not invited to this team", 403);
	}
	// check if the user has rejected the invite already
	if (inviteIndex !== -1 && team.invites[inviteIndex].status === "rejected") {
		throw createServiceError("You have rejected this invite already", 400);
	}
	if (inviteIndex !== -1 && team.invites[inviteIndex].status === "accepted") {
		throw createServiceError("Invite has already been accepted", 400);
	}

	// other wise add the team member and change his status
	team.members.push({ userId, status: "accepted", joinedAt: new Date() });
	if (inviteIndex !== -1) {
		team.invites[inviteIndex].status = "accepted";
		team.invites[inviteIndex].respondedAt = new Date();
	}
	await team.save();
	await finalizeTeamIfComplete(team._id);

	// get the team and populate it
	const populatedTeam = await TeamRegistration.findById(team._id)
		.populate("leaderId", "firstName lastName email")
		.populate("members.userId", "firstName lastName email");
	return populatedTeam;
};

// method to reject a hackathon 
const rejectHackathonInviteByCode = async (eventId, userId, payload) => {
	ensureValidObjectId(eventId, "event id");
	ensureValidObjectId(userId, "user id");
	// validate event
	await validateTeamEventAvailability(eventId);
	const user = await User.findById(userId).select("email");
	if (!user) {
		throw createServiceError("User not found", 404);
	}

	// optionally use invite code, otherwise resolve pending invite by participant email
	const inviteCode = payload?.inviteCode?.trim()?.toUpperCase();
	const teamQuery = inviteCode
		? { eventId, inviteCode, status: "pending" }
		: { eventId, status: "pending", "invites.email": user.email.toLowerCase() };

	// find if the user has actually received the invite code and has a pending status
	const team = await TeamRegistration.findOne(teamQuery);
	if (!team) {
		throw createServiceError("No pending invite found for this event", 404);
	}

	// check if the invite is valid
	const inviteIndex = team.invites.findIndex((invite) => invite.email === user.email.toLowerCase());
	if (inviteIndex === -1) {
		throw createServiceError("No invite found for this participant", 404);
	}
	if (team.invites[inviteIndex].status === "accepted") {
		throw createServiceError("Invite has already been accepted", 400);
	}

	// set the status to rejected
	team.invites[inviteIndex].status = "rejected";
	team.invites[inviteIndex].respondedAt = new Date();
	await team.save();
	await finalizeTeamIfComplete(team._id);

	return TeamRegistration.findById(team._id)
		.populate("leaderId", "firstName lastName email")
		.populate("members.userId", "firstName lastName email");
};

// 
const createEvent = async (data) => {
	// validate required scheduling fields before writing to db
	if (!data.registrationDeadline) {
		throw createServiceError("registrationDeadline is required", 400);
	}
	if (Number(data.registrationFee) < 0) {
		throw createServiceError("registrationFee cannot be negative", 400);
	}
	if (Number(data.registrationLimit) < 0) {
		throw createServiceError("registrationLimit cannot be negative", 400);
	}
	if (data.isTeamEvent) {
		const minTeamSize = Number(data.minTeamSize);
		const maxTeamSize = Number(data.maxTeamSize);
		if (Number.isNaN(minTeamSize) || Number.isNaN(maxTeamSize)) {
			throw createServiceError("minTeamSize and maxTeamSize are required for team events", 400);
		}
		if (minTeamSize < 2) {
			throw createServiceError("minTeamSize must be at least 2 for team events", 400);
		}
		if (maxTeamSize < minTeamSize) {
			throw createServiceError("maxTeamSize must be greater than or equal to minTeamSize", 400);
		}
	}
	if (Array.isArray(data.formSchema)) {
		const hasInvalidField = data.formSchema.some((field) => {
			if (!field || typeof field !== "object") {
				return true;
			}
			if (typeof field.label !== "string" || field.label.trim().length === 0) {
				return true;
			}
			if (!["text", "number", "file", "dropdown", "checkbox"].includes(field.fieldType)) {
				return true;
			}
			if (field.fieldType === "dropdown") {
				if (!Array.isArray(field.options) || field.options.filter(Boolean).length === 0) {
					return true;
				}
			}
			return false;
		});
		if (hasInvalidField) {
			throw createServiceError("Invalid formSchema configuration", 400);
		}
	}
	if (Array.isArray(data.merchItems)) {
		const hasInvalidMerchItem = data.merchItems.some((item) => {
			if (!item || typeof item !== "object") {
				return true;
			}
			if (typeof item.name !== "string" || item.name.trim().length === 0) {
				return true;
			}
			const price = Number(item.price);
			const stock = Number(item.stock);
			const limitPerUser = Number(item.limitPerUser);
			if (Number.isNaN(price) || price < 0) {
				return true;
			}
			if (Number.isNaN(stock) || stock < 0) {
				return true;
			}
			if (Number.isNaN(limitPerUser) || limitPerUser < 1) {
				return true;
			}
			if (item.variants && !Array.isArray(item.variants)) {
				return true;
			}
			return false;
		});
		if (hasInvalidMerchItem) {
			throw createServiceError("Invalid merchandise items configuration", 400);
		}
	}

	const start = new Date(data.startDate);
	const end = new Date(data.endDate);
	const deadline = new Date(data.registrationDeadline);

	// validate registration deadline date format early for cleaner error response
	if (Number.isNaN(deadline.getTime())) {
		throw createServiceError("registrationDeadline must be a valid date", 400);
	}

	const eventExists = await Event.findOne(data);
	if (eventExists) {
		throw createServiceError("Event already exists", 409);
	}

	if (data.startDate && data.endDate) {
		if (end < start) {
			throw createServiceError("End date can't be before start date", 400);
		}
	}

	if (data.endDate && deadline > end) {
		throw createServiceError("Deadline can't be after the end date", 400);
	}

	if (!data.status) {
		data.status = "draft";
	}

	const newEvent = await Event.create(data);
	return newEvent;
};

const deleteEvent = async (eventId) => {
	ensureValidObjectId(eventId, "event id");
	const eventExists = await Event.findById(eventId);
	if (!eventExists) {
		throw createServiceError("Event not found", 404);
	}

	await Event.findByIdAndDelete(eventId);
};

// get top 5 trending events by registrations in last 24h
const getTrendingEvents = async () => {
	const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
	const trending = await Registration.aggregate([
		{
			$match: {
				createdAt: { $gte: since },
				status: { $ne: "cancelled" },
			},
		},
		{
			$group: {
				_id: "$eventId",
				regCount: { $sum: 1 },
			},
		},
		{ $sort: { regCount: -1 } },
		{ $limit: 5 },
	]);

	if (trending.length === 0) {
		return [];
	}

	const orderedEventIds = trending.map((item) => item._id.toString());
	const events = await Event.find({
		_id: { $in: orderedEventIds },
		status: "published",
	}).populate("organizerId", "name category");

	const eventMap = new Map(events.map((event) => [event._id.toString(), event]));
	return trending
		.map((item) => ({
			event: eventMap.get(item._id.toString()),
			regCount: item.regCount,
		}))
		.filter((item) => item.event)
		.map((item) => ({
			...item.event.toObject(),
			trendingRegistrations24h: item.regCount,
		}));
};

module.exports = {
	queryEvent,
	queryEventById,
	registerUserForEvent,
	createHackathonTeam,
	getMyTeamForEvent,
	joinHackathonTeamByCode,
	rejectHackathonInviteByCode,
	getTrendingEvents,
	createEvent,
	deleteEvent,
};
