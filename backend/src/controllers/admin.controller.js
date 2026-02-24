// admin controllers
const adminService = require("../services/admin.service");

const createOrganizer = async (req, res) => {
	try {
		const result = await adminService.createOrganizer(req.body, req.user.userId);

		// send result to frontend
		return res.status(201).json({
            message: "Organizer created successfully",
            credentials: result.credentials,
            organizer: result.organizer,
        });
	} catch (err) {
		console.error("Create Organizer Error", err.message);
 		return res.status(err.statusCode || 500).json({message: err.message});
	}	
}; 

const getAllOrganizer = async (req, res) => {
	try {
		const organizers = await adminService.getAllOrganizer();
		return res.status(200).json(organizers);
	} catch (err) {
		console.error("Failed to fetch the Organizers", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
}; 

const removeOrganizer = async (req, res) => {
	try {
		// get the organizer id
		const organizerId = req.params.id;
		await adminService.removeOrganizer(organizerId);
		return res.status(200).json({message:"Organizer Removed"});
	} catch (err) {
		console.error("Organizer removal error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}	
}; 

const updateOrganizerStatus = async (req, res) => {
	try {
		const organizer = await adminService.updateOrganizerStatus(req.params.id, req.body);
		return res.status(200).json({ message: "Organizer status updated", organizer });
	} catch (err) {
		console.error("Organizer status update error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getDashboardSummary = async (req, res) => {
	try {
		const summary = await adminService.getDashboardSummary();
		return res.status(200).json(summary);
	} catch (err) {
		console.error("Dashboard summary error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const getPasswordResetRequests = async (req, res) => {
	try {
		const requests = await adminService.getPasswordResetRequests(req.query);
		return res.status(200).json(requests);
	} catch (err) {
		console.error("Password reset request fetch error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const reviewPasswordResetRequest = async (req, res) => {
	try {
		const result = await adminService.reviewPasswordResetRequest(req.params.id, req.user.userId, req.body);
		return res.status(200).json({
			message: `Request ${result.request.status}`,
			request: result.request,
			credentials: result.credentials,
		});
	} catch (err) {
		console.error("Password reset review error", err.message);
		return res.status(err.statusCode || 500).json({message: err.message});
	}
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
