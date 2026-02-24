// organizer controllers

const organizerService = require("../services/organizer.service");

const createEvent = async (req, res) => {
	try {
		const event = await organizerService.createEventForOrganizer(req.user.userId, req.body);
		return res.status(201).json({message: "Event Created", event});
	} catch (err) {
		console.log("Create Event Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getMyProfile = async (req, res) => {
	try {
		const profile = await organizerService.getOrganizerProfile(req.user.userId);
		return res.status(200).json(profile);
	} catch (err) {
		console.log("Get Organizer Profile Error", err.message);
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const updateMyProfile = async (req, res) => {
	try {
		const profile = await organizerService.updateOrganizerProfile(req.user.userId, req.body);
		return res.status(200).json({ message: "Organizer profile updated", profile });
	} catch (err) {
		console.log("Update Organizer Profile Error", err.message);
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const deleteEvent = async (req, res) => {
	try {
		await organizerService.deleteEventForOrganizer(req.user.userId, req.params.id);
		return res.status(200).json({message: "Event Deleted"});
	} catch (err) {
		console.log("Delete Event Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getMyEvents = async (req, res) => {
	try {
		const result = await organizerService.getMyEvents(req.user.userId, req.query);
		return res.status(200).json(result);
	} catch (err) {
		console.log("Get Organizer Events Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getOngoingEvents = async (req, res) => {
	try {
		const events = await organizerService.getOngoingEvents(req.user.userId);
		return res.status(200).json({ events });
	} catch (err) {
		console.log("Get Ongoing Organizer Events Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const updateEvent = async (req, res) => {
	try {
		const event = await organizerService.updateEventForOrganizer(
			req.user.userId,
			req.params.id,
			req.body,
		);
		return res.status(200).json({ message: "Event Updated", event });
	} catch (err) {
		console.log("Update Event Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getEventAnalytics = async (req, res) => {
	try {
		const result = await organizerService.getEventAnalytics(req.user.userId, req.params.id);
		return res.status(200).json(result);
	} catch (err) {
		console.log("Get Event Analytics Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getEventParticipants = async (req, res) => {
	try {
		const participants = await organizerService.getEventParticipants(req.user.userId, req.params.id, req.query);
		return res.status(200).json(participants);
	} catch (err) {
		console.log("Get Event Participants Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const exportEventParticipantsCsv = async (req, res) => {
	try {
		const csv = await organizerService.getEventParticipantsCsv(req.user.userId, req.params.id, req.query);
		res.setHeader("Content-Type", "text/csv");
		res.setHeader("Content-Disposition", `attachment; filename="event-${req.params.id}-participants.csv"`);
		return res.status(200).send(csv);
	} catch (err) {
		console.log("Export Event Participants CSV Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getEventTeams = async (req, res) => {
	try {
		const teams = await organizerService.getEventTeams(req.user.userId, req.params.id);
		return res.status(200).json(teams);
	} catch (err) {
		console.log("Get Event Teams Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getEventMerchOrders = async (req, res) => {
	try {
		const orders = await organizerService.getEventMerchOrders(req.user.userId, req.params.id, req.query);
		return res.status(200).json(orders);
	} catch (err) {
		console.log("Get Event Merch Orders Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const reviewMerchOrder = async (req, res) => {
	try {
		const order = await organizerService.reviewMerchOrder(req.user.userId, req.params.id, req.params.orderId, req.body);
		return res.status(200).json({ message: "Order reviewed", order });
	} catch (err) {
		console.log("Review Merch Order Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getOrganizerAnalyticsSummary = async (req, res) => {
	try {
		const summary = await organizerService.getOrganizerAnalyticsSummary(req.user.userId);
		return res.status(200).json(summary);
	} catch (err) {
		console.log("Get Organizer Analytics Summary Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const requestPasswordReset = async (req, res) => {
	try {
		const request = await organizerService.requestPasswordReset(req.user.userId, req.body);
		return res.status(201).json({
			message: "Password reset request submitted",
			request,
		});
	} catch (err) {
		console.log("Request Password Reset Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getMyPasswordResetRequests = async (req, res) => {
	try {
		const requests = await organizerService.getMyPasswordResetRequests(req.user.userId);
		return res.status(200).json(requests);
	} catch (err) {
		console.log("Get Password Reset Requests Error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

module.exports = {
	createEvent,
	getMyProfile,
	updateMyProfile,
	deleteEvent,
	getMyEvents,
	getOngoingEvents,
	updateEvent,
	getEventAnalytics,
	getEventParticipants,
	exportEventParticipantsCsv,
	getEventTeams,
	getEventMerchOrders,
	reviewMerchOrder,
	getOrganizerAnalyticsSummary,
	requestPasswordReset,
	getMyPasswordResetRequests,
};
