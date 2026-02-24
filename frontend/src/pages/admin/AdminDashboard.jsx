import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import api from "@/lib/api";

const AdminDashboard = () => {
	const [summary, setSummary] = useState(null);

	useEffect(() => {
		const fetchSummary = async () => {
			try {
				const response = await api.get("/admin/dashboard");
				setSummary(response.data);
			} catch (err) {
				setSummary(null);
			}
		};

		fetchSummary();
	}, []);

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Admin Dashboard</h1>

			<Card>
				<CardHeader>
					<CardTitle>Summary</CardTitle>
				</CardHeader>
				<CardContent className="space-y-1 text-sm">
					<div>Total Organizers: {summary?.totalOrganizers ?? "-"}</div>
					<div>Active Organizers: {summary?.activeOrganizers ?? "-"}</div>
					<div>Pending Password Reset Requests: {summary?.pendingResetRequests ?? "-"}</div>
					<div>Total Password Reset Requests: {summary?.totalResetRequests ?? "-"}</div>
				</CardContent>
			</Card>

			<div className="flex gap-2">
				<Button asChild>
					<Link to="/admin/organizers">Manage Organizers</Link>
				</Button>
				<Button asChild variant="outline">
					<Link to="/admin/password-reset-requests">Password Reset Requests</Link>
				</Button>
			</div>
		</div>
	);
};

export default AdminDashboard;
