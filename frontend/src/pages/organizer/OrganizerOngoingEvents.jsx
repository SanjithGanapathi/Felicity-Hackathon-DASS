import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatEnumLabel } from "@/features/shared/constants/categories";
import api from "@/lib/api";

const OrganizerOngoingEvents = () => {
	const [events, setEvents] = useState([]);
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const response = await api.get("/organizer/events/ongoing");
				setEvents(response.data.events || []);
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch ongoing events",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setLoading(false);
			}
		};
		fetchEvents();
	}, []);

	if(loading) {
		return <div className="grid place-items-center py-10">Loading ongoing events...</div>;
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Ongoing Events</h1>
			{events.length === 0 ? (
				<div className="border rounded-md p-4 text-sm">No ongoing events right now.</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{events.map((event) => (
						<Card key={event._id}>
							<CardHeader>
								<CardTitle>{event.name}</CardTitle>
								<CardDescription>{formatEnumLabel(event.eventType)}</CardDescription>
							</CardHeader>
							<CardContent className="text-sm space-y-1">
								<div>Status: Ongoing</div>
								<div>Start: {event.startDate ? new Date(event.startDate).toLocaleString() : "TBD"}</div>
								<div>End: {event.endDate ? new Date(event.endDate).toLocaleString() : "TBD"}</div>
							</CardContent>
							<CardFooter>
								<Button asChild variant="outline">
									<Link to={`/organizer/events/${event._id}`}>Details</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
};

export default OrganizerOngoingEvents;
