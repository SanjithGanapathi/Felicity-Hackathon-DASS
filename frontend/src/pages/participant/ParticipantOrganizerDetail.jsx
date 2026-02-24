import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatEnumLabel } from "@/features/shared/constants/categories";
import api from "@/lib/api";

const ParticipantOrganizerDetail = () => {
	const { organizerId } = useParams();
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		const fetchDetail = async () => {
			try {
				const response = await api.get(`/participant/organizers/${organizerId}`);
				setData(response.data);
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch organizer details",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setLoading(false);
			}
		};
		fetchDetail();
	}, [organizerId]);

	if(loading) {
		return <div className="grid place-items-center py-10">Loading organizer details...</div>;
	}

	if(!data?.organizer) {
		return <div className="border rounded-md p-6 text-center">Organizer not found</div>;
	}

	const renderEventCard = (event) => (
		<Card key={event._id}>
			<CardHeader>
				<CardTitle>{event.name}</CardTitle>
				<CardDescription>{formatEnumLabel(event.eventType)}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-1 text-sm">
				<div>Status: {formatEnumLabel(event.status)}</div>
				<div>Eligibility: {formatEnumLabel(event.eligibility)}</div>
				<div>Start: {event.startDate ? new Date(event.startDate).toLocaleString() : "TBD"}</div>
				<div>End: {event.endDate ? new Date(event.endDate).toLocaleString() : "TBD"}</div>
				<div>Venue: {event.venue || "TBD"}</div>
				<Button asChild variant="outline" className="mt-2">
					<Link to={`/participant/events/${event._id}`}>View Event</Link>
				</Button>
			</CardContent>
		</Card>
	);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>{data.organizer.name}</CardTitle>
					<CardDescription>{data.organizer.category}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-1 text-sm">
					<div>{data.organizer.description || "No description provided"}</div>
					<div>Contact: {data.organizer.contactEmail}</div>
				</CardContent>
			</Card>

			<div className="space-y-2">
				<h2 className="text-xl font-semibold">Upcoming Events</h2>
				{(data.upcomingEvents || []).length === 0 ? (
					<div className="border rounded-md p-4 text-sm">No upcoming events</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{data.upcomingEvents.map(renderEventCard)}
					</div>
				)}
			</div>

			<div className="space-y-2">
				<h2 className="text-xl font-semibold">Past Events</h2>
				{(data.pastEvents || []).length === 0 ? (
					<div className="border rounded-md p-4 text-sm">No past events</div>
				) : (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{data.pastEvents.map(renderEventCard)}
					</div>
				)}
			</div>
		</div>
	);
};

export default ParticipantOrganizerDetail;
