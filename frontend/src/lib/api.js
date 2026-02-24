import axios from "axios";

// a method called api to abstract the base URL and make requests to the backend
const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
	withCredentials: true,
});

// auto-logout on token expiry: if backend returns 401 redirect to login
api.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response?.status === 401) {
			// avoid redirect loop if already on login or register page
			const currentHash = window.location.hash || "";
			if (!currentHash.includes("/login") && !currentHash.includes("/register")) {
				localStorage.removeItem("onboardingShown");
				window.location.hash = "#/login";
			}
		}
		return Promise.reject(error);
	},
);

export default api;
