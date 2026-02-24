import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const OrganizerPasswordReset = () => {
	const [reason, setReason] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [requests, setRequests] = useState([]);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	// get all the password reset requests sent and store it in the state variable requests
	const fetchRequests = async () => {
		setLoading(true);
		try {
			const response = await api.get("/organizer/password-reset-requests");
			setRequests(response.data || []);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch reset request history",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	// fetch those requests once the component mounts the dom
	useEffect(() => {
		fetchRequests();
	}, []);

	// method to create a new request and post it to the backend with the reason state variable
	const createRequest = async () => {
		const normalizedReason = reason.trim();
		if(!normalizedReason) {
			toast({
				variant: "destructive",
				title: "Reason is required",
				description: "Please enter a reason for the password reset request.",
			});
			return;
		}
		setSubmitting(true);
		try {
			await api.post("/organizer/password-reset-requests", { reason: normalizedReason });
			setReason("");
			toast({
				title: "Request submitted",
				description: "Your password reset request has been sent to admin.",
			});
			await fetchRequests();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to submit request",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	const hasPendingRequest = requests.some((request) => request.status === "pending");

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Request Password Reset</CardTitle>
					<CardDescription>Submit a request to admin for organizer account password reset</CardDescription>
				</CardHeader>
				<CardContent className="space-y-2">
					<Label htmlFor="reason">Reason</Label>
					<Input
						id="reason"
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						placeholder="Reason for password reset request"
					/>
				</CardContent>
				<CardFooter>
					<Button onClick={createRequest} disabled={submitting || hasPendingRequest}>
						{submitting ? "Submitting..." : "Submit Request"}
					</Button>
				</CardFooter>
			</Card>
			{hasPendingRequest ? (
				<div className="text-sm">A pending request already exists. Wait for admin review before creating a new one.</div>
			) : null}

			<Card>
				<CardHeader>
					<CardTitle>Request History</CardTitle>
				</CardHeader>
				{/* if not loading and non-zero requests then map the requests to a div element and display the information */}
				<CardContent className="space-y-3">
					{loading ? (
						<div>Loading request history...</div>
					) : requests.length === 0 ? (
						<div>No requests found</div>
					) : (
						requests.map((request) => (
							<div key={request._id} className="border rounded-md p-3 text-sm space-y-1">
								<div>Status: {request.status}</div>
								<div>Reason: {request.reason}</div>
								<div>Requested At: {new Date(request.createdAt).toLocaleString()}</div>
								{request.adminComment ? <div>Admin Comment: {request.adminComment}</div> : null}
								{request.reviewedBy ? (
									<div>Reviewed By: {request.reviewedBy.firstName} {request.reviewedBy.lastName} ({request.reviewedBy.email})</div>
								) : null}
								{request.reviewedAt ? <div>Reviewed At: {new Date(request.reviewedAt).toLocaleString()}</div> : null}
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default OrganizerPasswordReset;
