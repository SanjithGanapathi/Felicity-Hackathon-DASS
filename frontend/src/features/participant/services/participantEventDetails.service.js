import api from "@/lib/api";

const fetchEventById = async (eventId) => {
	const response = await api.get(`/events/${eventId}`);
	return response.data;
};

const fetchCurrentUser = async () => {
	const response = await api.get("/auth/me");
	return response.data;
};

const fetchMyRegistrations = async () => {
	const response = await api.get("/participant/my-registrations");
	return response.data;
};

const fetchMyTeam = async (eventId) => {
	const response = await api.get(`/events/${eventId}/team/my`);
	return response.data;
};

const registerForNormalEvent = async (eventId, payload = {}) => {
	const response = await api.post(`/events/${eventId}/register`, payload);
	return response.data;
};

const createTeamForEvent = async (eventId, payload) => {
	const response = await api.post(`/events/${eventId}/team/register`, payload);
	return response.data;
};

const joinTeamByCode = async (eventId, inviteCode) => {
	const response = await api.post(`/events/${eventId}/team/join-by-code`, { inviteCode });
	return response.data;
};

const rejectTeamInviteByCode = async (eventId, inviteCode) => {
	const payload = inviteCode ? { inviteCode } : {};
	const response = await api.post(`/events/${eventId}/team/reject-by-code`, payload);
	return response.data;
};

const fetchMerchOrdersByEvent = async (eventId) => {
	const response = await api.get("/participant/merch-orders", {
		params: { eventId },
	});
	return response.data;
};

const createMerchOrder = async (payload) => {
	const response = await api.post("/participant/merch-orders", payload);
	return response.data;
};

const submitMerchPaymentProof = async (orderId, paymentProofUrl) => {
	const response = await api.patch(`/participant/merch-orders/${orderId}/proof`, { paymentProofUrl });
	return response.data;
};

export {
	fetchEventById,
	fetchCurrentUser,
	fetchMyRegistrations,
	fetchMyTeam,
	registerForNormalEvent,
	createTeamForEvent,
	joinTeamByCode,
	rejectTeamInviteByCode,
	fetchMerchOrdersByEvent,
	createMerchOrder,
	submitMerchPaymentProof,
};
