import api from "@/lib/api";

const fetchEvents = async (params) => {
	const response = await api.get("/events", { params });
	return response.data;
};

const fetchTrendingEvents = async () => {
	const response = await api.get("/events/trending");
	return response.data;
};

const fetchMyRegistrations = async () => {
	const response = await api.get("/participant/my-registrations");
	return response.data;
};

const registerForEvent = async (eventId) => {
	const response = await api.post(`/events/${eventId}/register`);
	return response.data;
};

export {
	fetchEvents,
	fetchTrendingEvents,
	fetchMyRegistrations,
	registerForEvent,
};
