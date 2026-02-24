import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { EVENT_STATUS_OPTIONS, formatEnumLabel } from "@/features/shared/constants/categories";

const getOrganizerDisplayStatus = (event) => {
	const now = new Date();
	if(event.status === "cancelled" || event.status === "completed") {
		return "Closed";
	}
	if(event.status === "published" && event.startDate && event.endDate) {
		const start = new Date(event.startDate);
		const end = new Date(event.endDate);
		if(start <= now && now <= end) {
			return "Ongoing";
		}
	}
	if(event.status === "published") {
		return "Published";
	}
	if(event.status === "draft") {
		return "Draft";
	}
	return formatEnumLabel(event.status);
};

const OrganizerDashboard = () => {
	const [events, setEvents] = useState([]);
	const [summary, setSummary] = useState(null);
	const [status, setStatus] = useState("");
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState(null);
	const { toast } = useToast();

	// fetch all the events that the organizer has opened and store it in a state variable events
	const fetchEvents = async () => {
		setLoading(true);
		try {
			const response = await api.get("/organizer/events", {
				params: {
					status: status || undefined,
				},
			});
			setEvents(response.data.events || []);
			const summaryResponse = await api.get("/organizer/analytics/summary");
			setSummary(summaryResponse.data);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch organizer events",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		fetchEvents();
	}, []);

	// put a request to the event route to delete by id
	const deleteEvent = async (eventId) => {
		setDeletingId(eventId);
		try {
			await api.delete(`/events/${eventId}`);
			setEvents((prev) => prev.filter((event) => event._id !== eventId));
			toast({
				title: "Event deleted",
				description: "The event has been removed.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to delete event",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setDeletingId(null);
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Analytics Summary</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
					<div>Total Events: {summary?.totalEvents ?? "-"}</div>
					<div>Active Events: {summary?.activeEvents ?? "-"}</div>
					<div>Completed Events: {summary?.completedEvents ?? "-"}</div>
					<div>Total Registrations: {summary?.totalRegistrations ?? "-"}</div>
					<div>Attendance Count: {summary?.attendedCount ?? "-"}</div>
					<div>Estimated Revenue: {summary?.estimatedRevenue ?? "-"}</div>
					{(summary?.eventBreakdown || []).length > 0 ? (
						<div className="md:col-span-3">
							Top Completed Events:
							{summary.eventBreakdown.slice(0, 3).map((eventItem) => (
								<div key={eventItem.eventId}>
									{eventItem.eventName || "Unnamed"} | Registrations: {eventItem.registrations} | Revenue: {eventItem.estimatedRevenue}
								</div>
							))}
						</div>
					) : null}
				</CardContent>
			</Card>

			<div className="flex items-center justify-between">
				<div className="space-y-1">
					<h1 className="text-2xl font-semibold">Organizer Dashboard</h1>
					<p>Manage events you have created.</p>
				</div>
				<Button asChild>
					<Link to="/organizer/events/new">Create Event</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Filter</CardTitle>
				</CardHeader>
				<CardContent className="flex items-end gap-2">
					<div className="space-y-2">
						<Label htmlFor="status">Status</Label>
						<select
							id="status"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">All statuses</option>
							{EVENT_STATUS_OPTIONS.map((statusValue) => (
								<option key={statusValue.value} value={statusValue.value}>
									{statusValue.label}
								</option>
							))}
						</select>
					</div>
					<Button variant="outline" onClick={fetchEvents} disabled={loading}>
						Apply
					</Button>
				</CardContent>
			</Card>

			{/* after it loads map each event to a card with its id and display info and add a button to delete it */}
			{loading ? (
				<div className="grid place-items-center py-10">Loading events...</div>
			) : events.length === 0 ? (
				<div className="border rounded-md p-6 text-center">No events found</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{events.map((event) => (
						<Card key={event._id}>
							<CardHeader>
								<CardTitle>{event.name}</CardTitle>
								<CardDescription>{event.eventType}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-1 text-sm">
								<div>Status: {getOrganizerDisplayStatus(event)}</div>
								<div>Registration deadline: {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleString() : "N/A"}</div>
								<div>Start: {event.startDate ? new Date(event.startDate).toLocaleString() : "N/A"}</div>
							</CardContent>
							<CardFooter className="flex gap-2">
								<Button asChild variant="outline">
									<Link to={`/organizer/events/${event._id}`}>Details</Link>
								</Button>
								{/* disable the button using useState once it is clicked and is still not deleted to prevent infinite calls*/}
								<Button
									variant="outline"
									onClick={() => deleteEvent(event._id)}
									disabled={deletingId === event._id}
								>
									{deletingId === event._id ? "Deleting..." : "Delete"}
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
};

export default OrganizerDashboard;
