// participant controllers

const participantService = require("../services/participant.service");

const getProfile = async (req, res) => {
	try {
		const user = await participantService.fetchProfile(req.user.userId);
		return res.status(200).json(user);
	} catch (err) {
		console.log("Error in fetching profile");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const updateProfile = async (req, res) => {
	try {
		const user = await participantService.updateProfile(req.user.userId, req.body);
		return res.status(200).json(user);
	} catch (err) {
		console.log("Error in updating profile");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const updatePassword = async (req, res) => {
	try {
		await participantService.updatePassword(req.user.userId, req.body);
		return res.status(200).json({message: "Password updated successfully"});
	} catch (err) {
		console.log("Error in updating password");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getMyRegistrations = async (req, res) => {
	try {
		const registrations = await participantService.fetchRegistrations(req.user.userId);
		return res.status(200).json(registrations);
	} catch (err) {
		console.log("Error in fetching registrations");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getOrganizers = async (req, res) => {
	try {
		const organizers = await participantService.fetchOrganizers();
		return res.status(200).json(organizers);
	} catch (err) {
		console.log("Error in fetching organizer");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getOrganizerDetail = async (req, res) => {
	try {
		const result = await participantService.fetchOrganizerDetail(req.params.organizerId);
		return res.status(200).json(result);
	} catch (err) {
		console.log("Error in fetching organizer detail");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const followOrganizer = async (req, res) => {
	try {
		const organizerName = await participantService.followOrganizer(req.user.userId, req.params.organizerId);
		return res.status(200).json({message: `You are following ${organizerName}`});
	} catch (err) {
		console.log("Error in following organizer");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const unfollowOrganizer = async (req, res) => {
	try {
		const organizerName = await participantService.unfollowOrganizer(req.user.userId, req.params.organizerId);
		return res.status(200).json({message: `You unfollowed ${organizerName}`});
	} catch (err) {
		console.log("Error in unfollowing organizer");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const createMerchOrder = async (req, res) => {
	try {
		const order = await participantService.createMerchOrder(req.user.userId, req.body);
		return res.status(201).json({ message: "Order created", order });
	} catch (err) {
		console.log("Error in creating merch order");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const submitMerchPaymentProof = async (req, res) => {
	try {
		const order = await participantService.submitMerchPaymentProof(req.user.userId, req.params.orderId, req.body);
		return res.status(200).json({ message: "Payment proof submitted", order });
	} catch (err) {
		console.log("Error in submitting merch payment proof");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getMyMerchOrders = async (req, res) => {
	try {
		const orders = await participantService.fetchMyMerchOrders(req.user.userId, req.query);
		return res.status(200).json(orders);
	} catch (err) {
		console.log("Error in fetching merch orders");
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

module.exports = {
	getProfile,
	updateProfile,
	updatePassword,
	getMyRegistrations,
	getOrganizers,
	getOrganizerDetail,
	followOrganizer,
	unfollowOrganizer,
	createMerchOrder,
	submitMerchPaymentProof,
	getMyMerchOrders,
};
