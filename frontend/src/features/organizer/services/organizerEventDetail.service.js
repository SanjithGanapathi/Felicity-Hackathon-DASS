import api from "@/lib/api";

const fetchOrganizerEventAnalytics = async (eventId) => {
	const response = await api.get(`/organizer/events/${eventId}/analytics`);
	return response.data;
};

const fetchOrganizerEventParticipants = async (eventId, params) => {
	const response = await api.get(`/organizer/events/${eventId}/participants`, { params });
	return response.data;
};

const fetchOrganizerEventTeams = async (eventId) => {
	const response = await api.get(`/organizer/events/${eventId}/teams`);
	return response.data;
};

const fetchOrganizerMerchOrders = async (eventId) => {
	const response = await api.get(`/organizer/events/${eventId}/merch-orders`);
	return response.data;
};

const updateOrganizerEvent = async (eventId, payload) => {
	const response = await api.patch(`/organizer/events/${eventId}`, payload);
	return response.data;
};

const reviewOrganizerMerchOrder = async (eventId, orderId, payload) => {
	const response = await api.patch(`/organizer/events/${eventId}/merch-orders/${orderId}/review`, payload);
	return response.data;
};

export {
	fetchOrganizerEventAnalytics,
	fetchOrganizerEventParticipants,
	fetchOrganizerEventTeams,
	fetchOrganizerMerchOrders,
	updateOrganizerEvent,
	reviewOrganizerMerchOrder,
};
