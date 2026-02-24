import api from "@/lib/api";

const fetchOrganizerProfile = async () => {
	const response = await api.get("/organizer/me");
	return response.data;
};

const updateOrganizerProfile = async (payload) => {
	const response = await api.patch("/organizer/me", payload);
	return response.data;
};

export {
	fetchOrganizerProfile,
	updateOrganizerProfile,
};
