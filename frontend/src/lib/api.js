import axios from "axios";

// a method called api to abstract the base URL and make requests to the backend
const api = axios.create({
	baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:5000",
	withCredentials: true,
});

export default api;
