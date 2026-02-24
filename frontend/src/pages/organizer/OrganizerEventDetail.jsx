import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
	fetchOrganizerEventAnalytics,
	fetchOrganizerEventParticipants,
	fetchOrganizerEventTeams,
	fetchOrganizerMerchOrders,
	updateOrganizerEvent,
	reviewOrganizerMerchOrder,
} from "@/features/organizer/services/organizerEventDetail.service";

const PARTICIPANT_STATUS_OPTIONS = ["registered", "waitlisted", "cancelled", "attended"];

const OrganizerEventDetail = () => {
	const { id } = useParams();
	const [analytics, setAnalytics] = useState(null);
	const [participants, setParticipants] = useState([]);
	const [teams, setTeams] = useState([]);
	const [merchOrders, setMerchOrders] = useState([]);
	const [reviewComments, setReviewComments] = useState({});
	const [reviewingOrderId, setReviewingOrderId] = useState(null);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState("");
	const [updating, setUpdating] = useState(false);
	const [description, setDescription] = useState("");
	const [registrationLimit, setRegistrationLimit] = useState("");
	const [registrationDeadline, setRegistrationDeadline] = useState("");
	const [merchItems, setMerchItems] = useState([]);
	const { toast } = useToast();

	// get the data of all events after the search and status are set or set them to null and continue
	const fetchPageData = async () => {
		setLoading(true);
		try {
			const analyticsData = await fetchOrganizerEventAnalytics(id);
			// use promise to fetch all the data that includes participants, teams, merch orders for an event
			const [participantsResponse, teamsResponse, merchOrdersResponse] = await Promise.all([
				fetchOrganizerEventParticipants(id, {
					search: search || undefined,
					status: statusFilter || undefined,
				}),
				analyticsData?.event?.isTeamEvent
					? fetchOrganizerEventTeams(id)
					: Promise.resolve([]),
				analyticsData?.event?.eventType === "merchandise"
					? fetchOrganizerMerchOrders(id)
					: Promise.resolve([]),
			]);

			// set the data 
			setAnalytics(analyticsData);
			setParticipants(participantsResponse || []);
			setTeams(teamsResponse || []);
			setMerchOrders(merchOrdersResponse || []);
			setDescription(analyticsData?.event?.description || "");
			setRegistrationLimit(String(analyticsData?.event?.registrationLimit || 0));
			const eventDeadline = analyticsData?.event?.registrationDeadline;
			setRegistrationDeadline(eventDeadline ? new Date(eventDeadline).toISOString().slice(0, 10) : "");
			setMerchItems(
				(analyticsData?.event?.merchItems || []).map((item) => ({
					name: item.name || "",
					price: String(item.price ?? 0),
					stock: String(item.stock ?? 0),
					variantsText: Array.isArray(item.variants) ? item.variants.join(", ") : "",
					limitPerUser: String(item.limitPerUser ?? 1),
				})),
			);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch organizer event details",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	const addMerchItem = () => {
		setMerchItems((prev) => ([
			...prev,
			{ name: "", price: "0", stock: "0", variantsText: "", limitPerUser: "1" },
		]));
	};

	const updateMerchItem = (index, key, value) => {
		setMerchItems((prev) => prev.map((item, itemIndex) => (
			itemIndex === index ? { ...item, [key]: value } : item
		)));
	};

	const removeMerchItem = (index) => {
		setMerchItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
	};

	const saveMerchItems = async () => {
		const normalizedMerchItems = merchItems
			.map((item) => ({
				name: item.name.trim(),
				price: Number(item.price),
				stock: Number(item.stock),
				variants: item.variantsText.split(",").map((variant) => variant.trim()).filter(Boolean),
				limitPerUser: Number(item.limitPerUser),
			}))
			.filter((item) => item.name.length > 0);

		await updateEvent({ merchItems: normalizedMerchItems });
	};

	// fetch the data once while mounting
	useEffect(() => {
		fetchPageData();
	}, [id]);

	// update the data by calling a patch request to the backend and then fetch the page data again
	const updateEvent = async (payload) => {
		// set the updating state var to true
		setUpdating(true);
		try {
			await updateOrganizerEvent(id, payload);
			await fetchPageData();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to update event",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setUpdating(false);
		}
	};

	// get the csv data
	const exportCsv = () => {
		const params = new URLSearchParams();
		if(search) params.append("search", search);
		if(statusFilter) params.append("status", statusFilter);
		window.open(`${import.meta.env.VITE_API_BASE_URL || "http://localhost:5000"}/organizer/events/${id}/participants/export?${params.toString()}`, "_blank");
	};

	// send the review to the backend to patch the order
	const reviewMerchOrder = async (orderId, action) => {
		setReviewingOrderId(orderId);
		try {
			await reviewOrganizerMerchOrder(id, orderId, {
				action,
				comment: reviewComments[orderId] || "",
			});
			// fetch the new data
			await fetchPageData();
			toast({
				title: "Order updated",
				description: `Order ${action}d successfully.`,
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to review order",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setReviewingOrderId(null);
		}
	};

	if(loading) {
		return <div className="grid place-items-center py-10">Loading event detail...</div>;
	}

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{analytics?.event?.name || "Event Detail"}</CardTitle>
					<CardDescription>Organizer event analytics and participants</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
					<div>Type: {analytics?.event?.eventType || "-"}</div>
					<div>Eligibility: {analytics?.event?.eligibility || "-"}</div>
					<div>Registration Fee: {analytics?.event?.registrationFee ?? "-"}</div>
					<div>Start Date: {analytics?.event?.startDate ? new Date(analytics.event.startDate).toLocaleString() : "-"}</div>
					<div>End Date: {analytics?.event?.endDate ? new Date(analytics.event.endDate).toLocaleString() : "-"}</div>
					<div>Total Registrations: {analytics?.analytics?.totalRegistrations ?? "-"}</div>
					<div>Attended: {analytics?.analytics?.attendedCount ?? "-"}</div>
					<div>Cancelled: {analytics?.analytics?.cancelledCount ?? "-"}</div>
					<div>Estimated Revenue: {analytics?.analytics?.estimatedRevenue ?? "-"}</div>
					<div>Status: {analytics?.event?.status || "-"}</div>
					<div>Registration Open: {analytics?.event?.registrationOpen ? "Yes" : "No"}</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Quick Updates</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="space-y-2 md:col-span-3">
						<Label htmlFor="description">Description</Label>
						<Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="registrationDeadline">Registration Deadline</Label>
						<Input
							id="registrationDeadline"
							type="date"
							value={registrationDeadline}
							onChange={(e) => setRegistrationDeadline(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="registrationLimit">Registration Limit</Label>
						<Input
							id="registrationLimit"
							type="number"
							value={registrationLimit}
							onChange={(e) => setRegistrationLimit(e.target.value)}
						/>
					</div>
				</CardContent>
					<CardFooter className="flex gap-2">
					<Button
						onClick={() =>
							updateEvent({
								description,
								registrationLimit: Number(registrationLimit),
								registrationDeadline: registrationDeadline ? `${registrationDeadline}T00:00` : undefined,
							})
						}
						disabled={updating}
					>
						{updating ? "Saving..." : "Save"}
					</Button>
						<Button variant="outline" onClick={() => updateEvent({ registrationOpen: false })} disabled={updating}>
							Close Registrations
						</Button>
						{analytics?.event?.status === "draft" ? (
							<Button variant="outline" onClick={() => updateEvent({ status: "published" })} disabled={updating}>
								Publish Event
							</Button>
						) : null}
						<Button variant="outline" onClick={() => updateEvent({ status: "completed" })} disabled={updating}>
							Mark Completed
						</Button>
					</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Participants</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
						<div className="grid grid-cols-1 md:grid-cols-3 gap-3">
							<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="search by name or email" />
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value)}
								className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								<option value="">All statuses</option>
								{PARTICIPANT_STATUS_OPTIONS.map((statusValue) => (
									<option key={statusValue} value={statusValue}>
										{statusValue}
									</option>
								))}
							</select>
							<div className="flex gap-2">
							<Button variant="outline" onClick={fetchPageData}>Apply</Button>
							<Button variant="outline" onClick={exportCsv}>Export CSV</Button>
						</div>
					</div>
					<div className="space-y-2">
						{participants.length === 0 ? (
							<div>No participants found</div>
						) : (
							participants.map((participant) => (
								<div key={participant.registrationId} className="border rounded-md p-3 text-sm">
									<div>{participant.name}</div>
									<div>{participant.email}</div>
									<div>Status: {participant.status}</div>
									<div>Registration Date: {participant.registrationDate ? new Date(participant.registrationDate).toLocaleString() : "N/A"}</div>
									<div>Payment: {participant.payment || "N/A"}</div>
									<div>Team: {participant.teamName || "-"}</div>
									<div>Attendance: {participant.attendance ? "Yes" : "No"}</div>
								</div>
							))
						)}
					</div>
				</CardContent>
			</Card>

			{analytics?.event?.isTeamEvent ? (
				<Card>
					<CardHeader>
						<CardTitle>Teams</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{teams.length === 0 ? (
							<div>No teams found</div>
						) : (
							teams.map((team) => (
								<div key={team.teamId} className="border rounded-md p-3 text-sm space-y-1">
									<div>{team.teamName}</div>
									<div>Status: {team.status}</div>
									<div>Members: {team.memberCount}/{team.teamSize}</div>
									<div>Leader: {team.leader?.name || "-"} ({team.leader?.email || "-"})</div>
									<div>Invite Code: {team.inviteCode}</div>
									<div>
										Invites: {team.invites?.length ? team.invites.map((invite) => `${invite.email} (${invite.status})`).join(", ") : "none"}
									</div>
								</div>
							))
						)}
					</CardContent>
				</Card>
			) : null}

			{analytics?.event?.eventType === "merchandise" ? (
				<Card>
					<CardHeader>
						<CardTitle>Merchandise Catalog</CardTitle>
						<CardDescription>
							{analytics?.event?.status === "draft"
								? "Edit merchandise items while event is in draft."
								: "Catalog is locked after publish based on lifecycle rules."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{merchItems.length === 0 ? <div>No merchandise items configured.</div> : null}
						{merchItems.map((item, index) => (
							<div key={`merch-edit-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border rounded-md p-3">
								<div className="space-y-1">
									<Label>Name</Label>
									<Input
										value={item.name}
										onChange={(e) => updateMerchItem(index, "name", e.target.value)}
										disabled={analytics?.event?.status !== "draft"}
									/>
								</div>
								<div className="space-y-1">
									<Label>Price</Label>
									<Input
										type="number"
										min="0"
										value={item.price}
										onChange={(e) => updateMerchItem(index, "price", e.target.value)}
										disabled={analytics?.event?.status !== "draft"}
									/>
								</div>
								<div className="space-y-1">
									<Label>Stock</Label>
									<Input
										type="number"
										min="0"
										value={item.stock}
										onChange={(e) => updateMerchItem(index, "stock", e.target.value)}
										disabled={analytics?.event?.status !== "draft"}
									/>
								</div>
								<div className="space-y-1">
									<Label>Limit / User</Label>
									<Input
										type="number"
										min="1"
										value={item.limitPerUser}
										onChange={(e) => updateMerchItem(index, "limitPerUser", e.target.value)}
										disabled={analytics?.event?.status !== "draft"}
									/>
								</div>
								<div className="space-y-1">
									<Button
										variant="outline"
										onClick={() => removeMerchItem(index)}
										disabled={analytics?.event?.status !== "draft"}
									>
										Remove
									</Button>
								</div>
								<div className="space-y-1 md:col-span-5">
									<Label>Variants (comma separated)</Label>
									<Input
										value={item.variantsText}
										onChange={(e) => updateMerchItem(index, "variantsText", e.target.value)}
										disabled={analytics?.event?.status !== "draft"}
									/>
								</div>
							</div>
						))}
					</CardContent>
					{analytics?.event?.status === "draft" ? (
						<CardFooter className="flex gap-2">
							<Button variant="outline" onClick={addMerchItem} disabled={updating}>
								Add Item
							</Button>
							<Button onClick={saveMerchItems} disabled={updating}>
								{updating ? "Saving..." : "Save Catalog"}
							</Button>
						</CardFooter>
					) : null}
				</Card>
			) : null}

			{analytics?.event?.eventType === "merchandise" ? (
				<Card>
					<CardHeader>
						<CardTitle>Merchandise Orders</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{merchOrders.length === 0 ? (
							<div>No orders found</div>
						) : (
							merchOrders.map((order) => (
								<div key={order.orderId} className="border rounded-md p-3 text-sm space-y-1">
									<div>Participant: {order.participant?.name || "-"} ({order.participant?.email || "-"})</div>
									<div>Item: {order.itemName} {order.variant ? `(${order.variant})` : ""}</div>
									<div>Quantity: {order.quantity}</div>
									<div>Total Amount: {order.totalAmount}</div>
									<div>Status: {order.status}</div>
									<div>
										Payment Proof: {order.paymentProofUrl ? <a className="underline" href={order.paymentProofUrl} target="_blank" rel="noreferrer">View</a> : "Not provided"}
									</div>
									{order.reviewComment ? <div>Review Comment: {order.reviewComment}</div> : null}
									{order.status === "pending_approval" ? (
										<div className="space-y-2">
											<Input
												value={reviewComments[order.orderId] || ""}
												onChange={(e) => setReviewComments((prev) => ({ ...prev, [order.orderId]: e.target.value }))}
												placeholder="review comment (optional)"
											/>
											<div className="flex gap-2">
												<Button
													onClick={() => reviewMerchOrder(order.orderId, "approve")}
													disabled={reviewingOrderId === order.orderId}
												>
													Approve
												</Button>
												<Button
													variant="outline"
													onClick={() => reviewMerchOrder(order.orderId, "reject")}
													disabled={reviewingOrderId === order.orderId}
												>
													Reject
												</Button>
											</div>
										</div>
									) : null}
								</div>
							))
						)}
					</CardContent>
				</Card>
			) : null}
		</div>
	);
};

export default OrganizerEventDetail;
