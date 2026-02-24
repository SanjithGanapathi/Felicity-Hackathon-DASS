import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
	fetchEvents as fetchParticipantEvents,
	fetchTrendingEvents as fetchParticipantTrendingEvents,
	fetchMyRegistrations as fetchParticipantRegistrations,
	registerForEvent as registerParticipantForEvent,
} from "@/features/participant/services/participantEvents.service";
import { EVENT_TYPE_OPTIONS, ELIGIBILITY_OPTIONS, formatEnumLabel } from "@/features/shared/constants/categories";
import api from "@/lib/api";

const ParticipantEvents = () => {
	const [events, setEvents] = useState([]);
	const [trendingEvents, setTrendingEvents] = useState([]);
	const [interestSet, setInterestSet] = useState(new Set());
	const [followingSet, setFollowingSet] = useState(new Set());
	const [participantType, setParticipantType] = useState(null);
	// input filters
	const [search, setSearch] = useState("");
	const [type, setType] = useState("");
	const [eligibility, setEligibility] = useState("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [followedOnly, setFollowedOnly] = useState(false);

	const [loading, setLoading] = useState(true);
	// set of registered event ids to render the page after events have been registered
	const [registeredEventIds, setRegisteredEventIds] = useState([]);
	// state to check if registration has completed or not
	// use id to state not registered and then use null to say no events to be registered rn
	const [registeringId, setRegisteringId] = useState(null);
	const { toast } = useToast();


	// send an api call to the backend to fetch all events
	const fetchEvents = async () => {
		setLoading(true);
		try {
			const responseData = await fetchParticipantEvents({
				search: search || undefined,
				type: type || undefined,
				eligibility: eligibility || undefined,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				followedOnly: followedOnly ? "true" : undefined,
			});
			setEvents(responseData.events || []);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch events",
				// chain the message to prevent undefined error i.e. present data and message only if present (?)
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	const fetchTrendingEvents = async () => {
		try {
			const responseData = await fetchParticipantTrendingEvents();
			const scoredEvents = (responseData.events || [])
				.map((event) => {
					const tagScore = (event.tags || []).reduce((total, tag) => (
						interestSet.has(String(tag || "").toLowerCase()) ? total + 1 : total
					), 0);
					const score = Number(event.registrationCount || 0) + Number(event.trendingRegistrations24h || 0) * 2 + tagScore * 3;
					return { ...event, _rankScore: score, _tagScore: tagScore };
				})
				.sort((left, right) => right._rankScore - left._rankScore)
				.slice(0, 5)
				.map((event, index) => ({ ...event, rank: index + 1 }));
			setTrendingEvents(scoredEvents);
		} catch (err) {
			setTrendingEvents([]);
		}
	};

	const fetchInterests = async () => {
		try {
			const response = await api.get("/participant/me");
			const interests = response.data?.participantProfile?.interests || [];
			setInterestSet(new Set(interests.map((item) => String(item).toLowerCase())));
			const following = response.data?.participantProfile?.following || [];
			setFollowingSet(new Set(following.map((id) => String(id))));
			setParticipantType(response.data?.participantProfile?.participantType || null);
		} catch (err) {
			setInterestSet(new Set());
			setFollowingSet(new Set());
		}
	};

	const fetchMyRegistrations = async () => {
		try {
			const buckets = await fetchParticipantRegistrations();
			const allRegistrations = [
				...(buckets.upcoming || []),
				...(buckets.normal || []),
				...(buckets.merchandise || []),
				...(buckets.completed || []),
				...(buckets.cancelled || []),
			];

			const uniqueEventIds = Array.from(
				new Set(
					allRegistrations
						.map((registration) => registration.eventId?._id)
						.filter(Boolean)
				)
			);
			setRegisteredEventIds(uniqueEventIds);
		} catch (err) {
		}
	};

	// fetch all the events once it mounts the component
	useEffect(() => {
		const loadPageData = async () => {
			await fetchInterests();
			await Promise.all([fetchEvents(), fetchMyRegistrations()]);
		};
		loadPageData();
	}, []);

	useEffect(() => {
		fetchTrendingEvents();
	}, [interestSet.size]);

	const registerForEvent = async (eventId) => {
		setRegisteringId(eventId);
		try {
			await registerParticipantForEvent(eventId);
			setRegisteredEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
			toast({
				title: "Registered successfully",
				description: "Your registration has been recorded.",
			});
		} catch (err) {
			// check if the user has registered for this event and then add it to the set of registered event ids using spread op
			if (err.response?.data?.message === "You are already registered for this event") {
				setRegisteredEventIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
			}
			toast({
				variant: "destructive",
				title: "Registration failed",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setRegisteringId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold">Browse Events</h1>
				<p>Search and register for published events.</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Trending Events (24h)</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm">
					{trendingEvents.length === 0 ? (
						<div>No trending events right now.</div>
					) : (
						trendingEvents.map((event) => (
							<Card key={event._id}>
								<CardHeader>
									<CardTitle>#{event.rank} {event.name}</CardTitle>
									<CardDescription>{formatEnumLabel(event.eventType)}</CardDescription>
								</CardHeader>
								<CardContent className="space-y-1">
									<div>Total Registrations: {event.registrationCount || 0}</div>
									<div>Registrations (24h): {event.trendingRegistrations24h || 0}</div>
									<div>Organizer: {event.organizerId?.name || "N/A"}</div>
								</CardContent>
							</Card>
						))
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Filters</CardTitle>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div className="space-y-2">
						<Label htmlFor="search">Search</Label>
						<Input
							id="search"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="event or organizer"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="type">Type</Label>
						<select
							id="type"
							value={type}
							onChange={(e) => setType(e.target.value)}
							className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">All types</option>
							{EVENT_TYPE_OPTIONS.map((typeValue) => (
								<option key={typeValue.value} value={typeValue.value}>
									{typeValue.label}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="eligibility">Eligibility</Label>
						<select
							id="eligibility"
							value={eligibility}
							onChange={(e) => setEligibility(e.target.value)}
							className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
						>
							<option value="">All eligibility</option>
							{ELIGIBILITY_OPTIONS.map((eligibilityValue) => (
								<option key={eligibilityValue.value} value={eligibilityValue.value}>
									{eligibilityValue.label}
								</option>
							))}
						</select>
					</div>
					<div className="space-y-2">
						<Label htmlFor="startDate">Start Date From</Label>
						<Input
							id="startDate"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="endDate">Start Date To</Label>
						<Input
							id="endDate"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
						/>
					</div>
					<div className="space-y-2 flex items-end">
						<Button
							variant={followedOnly ? "default" : "outline"}
							onClick={() => setFollowedOnly((prev) => !prev)}
							className="w-full"
						>
							{followedOnly ? "Following Only: On" : "Following Only: Off"}
						</Button>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={fetchEvents} disabled={loading}>
						{loading ? "Loading..." : "Apply"}
					</Button>
				</CardFooter>
			</Card>

			{/* conditionally render the component while checking if loading is set or no of events is 0 */}
			{loading ? (
				<div className="grid place-items-center py-8">Loading events...</div>
			) : events.length === 0 ? (
				<div className="border rounded-md p-6 text-center">No events found</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					{/* display all the fetched events and map them to a card and use the event._id to register */}
					{events.map((event) => {
						const isRecommended = (
							(event.organizerId?._id && followingSet.has(event.organizerId._id)) ||
							(event.tags || []).some((tag) => interestSet.has(String(tag).toLowerCase()))
						);
						const isIneligible = (
							(event.eligibility === "iiit_only" && participantType !== "IIIT") ||
							(event.eligibility === "non_iiit_only" && participantType !== "Non-IIIT")
						);
						return (
							<Card key={event._id}>
								<CardHeader>
									<CardTitle>{event.name}</CardTitle>
									<CardDescription>{formatEnumLabel(event.eventType)}</CardDescription>
									{isRecommended ? <div className="text-xs text-muted-foreground">Recommended for you</div> : null}
								</CardHeader>
								<CardContent className="space-y-1 text-sm">
									<div>Status: {event.status}</div>
									<div>Eligibility: {formatEnumLabel(event.eligibility)}</div>
									<div>Start: {event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}</div>
									<div>Organizer: {event.organizerId?.name || "N/A"}</div>
								</CardContent>
								{/* do a conditional render by checking if you have already registered for an event or not */}
								<CardFooter className="flex items-center gap-2">
									<Button asChild variant="outline">
										<Link to={`/participant/events/${event._id}`}>Details</Link>
									</Button>
									{isIneligible ? (
										<Button variant="outline" disabled>Not eligible</Button>
									) : event.isTeamEvent ? (
										<Button asChild>
											<Link to={`/participant/events/${event._id}`}>Team Register</Link>
										</Button>
									) : registeredEventIds.includes(event._id) ? (
										<Button variant="outline" disabled>
											Registered
										</Button>
									) : (
										<Button
											onClick={() => registerForEvent(event._id)}
											disabled={registeringId === event._id}
										>
											{registeringId === event._id ? "Registering..." : "Register"}
										</Button>
									)}
								</CardFooter>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default ParticipantEvents;
