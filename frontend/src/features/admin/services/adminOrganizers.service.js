import api from "@/lib/api";

const fetchAdminOrganizers = async () => {
	const response = await api.get("/admin/organizer");
	return response.data;
};

const createAdminOrganizer = async (payload) => {
	const response = await api.post("/admin/organizer", payload);
	return response.data;
};

const removeAdminOrganizer = async (organizerId) => {
	const response = await api.delete(`/admin/organizer/${organizerId}`);
	return response.data;
};

const updateAdminOrganizerStatus = async (organizerId, status) => {
	const response = await api.patch(`/admin/organizer/${organizerId}/status`, { status });
	return response.data;
};

export {
	fetchAdminOrganizers,
	createAdminOrganizer,
	removeAdminOrganizer,
	updateAdminOrganizerStatus,
};
