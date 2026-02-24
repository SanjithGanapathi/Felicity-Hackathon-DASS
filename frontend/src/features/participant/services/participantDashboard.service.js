import api from "@/lib/api";

const fetchDashboardData = async () => {
	const response = await api.get("/participant/my-registrations");
	return response.data;
};

export {
	fetchDashboardData,
};
