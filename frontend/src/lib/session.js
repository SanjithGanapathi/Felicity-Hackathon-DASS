import api from "@/lib/api";

// method to fetch the currently logged in user 
export const fetchMe = async () => {
	const response = await api.get("/auth/me");
	return response.data;
};

// method to post a lougout request to the backend
export const logoutSession = async () => {
	await api.post("/auth/logout");
};
