import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const AdminPasswordResetRequests = () => {
	const [requests, setRequests] = useState([]);
	const [status, setStatus] = useState("");
	const [loading, setLoading] = useState(true);
	const [reviewingId, setReviewingId] = useState(null);
	const [reviewData, setReviewData] = useState({});
	const [generatedCredentials, setGeneratedCredentials] = useState(null);
	const { toast } = useToast();

	const fetchRequests = async () => {
		setLoading(true);
		try {
			const response = await api.get("/admin/password-reset-requests", {
				params: { status: status || undefined },
			});
			setRequests(response.data || []);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch requests",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchRequests();
	}, []);

	const reviewRequest = async (requestId, action) => {
		setReviewingId(requestId);
		setGeneratedCredentials(null);
		try {
			const comment = reviewData[requestId] || "";
			if(action === "reject" && comment.trim().length === 0) {
				toast({
					variant: "destructive",
					title: "Comment required",
					description: "Please add a comment before rejecting a request.",
				});
				return;
			}
			const response = await api.patch(`/admin/password-reset-requests/${requestId}`, {
				action,
				comment,
			});
			if(response.data.credentials) {
				setGeneratedCredentials(response.data.credentials);
			}
			toast({
				title: "Request reviewed",
				description: `Request has been ${action}d successfully.`,
			});
			await fetchRequests();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to review request",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setReviewingId(null);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Password Reset Requests</CardTitle>
					<CardDescription>Review organizer password reset requests</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Label htmlFor="status">Status Filter</Label>
					<div className="flex gap-2">
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">all</option>
							<option value="pending">pending</option>
							<option value="approved">approved</option>
							<option value="rejected">rejected</option>
						</select>
						<Button variant="outline" onClick={fetchRequests} disabled={loading}>
							Apply
						</Button>
					</div>
				</CardContent>
			</Card>

			{generatedCredentials && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Organizer Credentials</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<div>Login Email: {generatedCredentials.loginEmail}</div>
						<div>Password: {generatedCredentials.password}</div>
						<div>{generatedCredentials.note}</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Requests</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{loading ? (
						<div>Loading requests...</div>
					) : requests.length === 0 ? (
						<div>No requests found</div>
					) : (
						requests.map((request) => (
							<div key={request._id} className="border rounded-md p-3 space-y-2">
								<div className="text-sm">
									<div>Club: {request.organizerId?.name || "N/A"}</div>
									<div>Email: {request.organizerAccountId?.email || "N/A"}</div>
									<div>Status: {request.status}</div>
									<div>Reason: {request.reason}</div>
									<div>Requested At: {new Date(request.createdAt).toLocaleString()}</div>
									{request.adminComment ? <div>Admin Comment: {request.adminComment}</div> : null}
									{request.reviewedBy ? (
										<div>Reviewed By: {request.reviewedBy.firstName} {request.reviewedBy.lastName} ({request.reviewedBy.email})</div>
									) : null}
									{request.reviewedAt ? <div>Reviewed At: {new Date(request.reviewedAt).toLocaleString()}</div> : null}
								</div>

								{request.status === "pending" && (
									<div className="space-y-2">
										<Input
											value={reviewData[request._id] || ""}
											onChange={(e) =>
												setReviewData((prev) => ({ ...prev, [request._id]: e.target.value }))
											}
											placeholder="Optional admin comment"
										/>
										<div className="flex gap-2">
											<Button
												onClick={() => reviewRequest(request._id, "approve")}
												disabled={reviewingId === request._id}
											>
												{reviewingId === request._id ? "Processing..." : "Approve"}
											</Button>
											<Button
												variant="outline"
												onClick={() => reviewRequest(request._id, "reject")}
												disabled={reviewingId === request._id}
											>
												{reviewingId === request._id ? "Processing..." : "Reject"}
											</Button>
										</div>
									</div>
								)}
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminPasswordResetRequests;
