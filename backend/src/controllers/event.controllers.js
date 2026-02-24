const eventService = require("../services/event.service");

const getAllEvents = async (req, res) => {
	try {
		// pass authenticated participant id when available for followed organizer filtering
		const result = await eventService.queryEvent({
			...req.query,
			userId: req.user?.userId || req.query.userId,
		});
		return res.status(200).json(result);
	} catch (err) {
		console.error("Get events error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getEventById = async (req, res) => {
	try {
		const event = await eventService.queryEventById(req.params.id);
		return res.status(200).json(event);
	} catch (err) {
		console.error("Get event by Id error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getTrendingEvents = async (req, res) => {
	try {
		const events = await eventService.getTrendingEvents();
		return res.status(200).json({ events });
	} catch (err) {
		console.error("Get trending events error", err.message);
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const registerUserForEvent = async (req, res) => {
	try {
		const registration = await eventService.registerUserForEvent(req.params.id, req.user.userId, req.body || {});
		return res.status(201).json({message: "Registered Successfully", registration});
	} catch (err) { 
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const createHackathonTeam = async (req, res) => {
	try {
		const team = await eventService.createHackathonTeam(req.params.id, req.user.userId, req.body);
		return res.status(201).json({ message: "Team created successfully", team });
	} catch (err) {
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const getMyHackathonTeam = async (req, res) => {
	try {
		const team = await eventService.getMyTeamForEvent(req.params.id, req.user.userId);
		return res.status(200).json({ team });
	} catch (err) {
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const joinHackathonTeamByCode = async (req, res) => {
	try {
		const team = await eventService.joinHackathonTeamByCode(req.params.id, req.user.userId, req.body);
		return res.status(200).json({ message: "Joined team successfully", team });
	} catch (err) {
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

const rejectHackathonInviteByCode = async (req, res) => {
	try {
		const team = await eventService.rejectHackathonInviteByCode(req.params.id, req.user.userId, req.body);
		return res.status(200).json({ message: "Invite rejected", team });
	} catch (err) {
		return res.status(err.statusCode || 500).json({ message: err.message });
	}
};

module.exports = {
	getAllEvents,
	getEventById,
	getTrendingEvents,
	registerUserForEvent,
	createHackathonTeam,
	getMyHackathonTeam,
	joinHackathonTeamByCode,
	rejectHackathonInviteByCode,
};
