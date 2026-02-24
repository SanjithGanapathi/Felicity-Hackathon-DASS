import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

const ParticipantOrganizers = () => {
	const [organizers, setOrganizers] = useState([]);
	// store the set of ids that the user follows 
	const [followingIds, setFollowingIds] = useState([]);
	const [loading, setLoading] = useState(true);
	const [actionId, setActionId] = useState(null);
	const { toast } = useToast();

	const fetchData = async () => {
		setLoading(true);
		try {
			// send a request to backend to fetch organizers and current user's following list to render page 
			const [organizerResponse, meResponse] = await Promise.all([
				api.get("/participant/organizers"),
				api.get("/participant/me"),
			]);

			setOrganizers(organizerResponse.data || []);
			const ids = (meResponse.data?.participantProfile?.following || []).map((org) =>
				typeof org === "string" ? org : org._id
			);
			setFollowingIds(ids);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch organizers",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	// run only once when mounts
	useEffect(() => {
		fetchData();
	}, []);

	// toggle the follow button and set state
	const toggleFollow = async (organizerId, isFollowing) => {
		setActionId(organizerId);
		try {
			// if following unfollow and set the following ids accordingly 
			if(isFollowing) {
				await api.delete(`/participant/following/${organizerId}`);
				setFollowingIds((prev) => prev.filter((id) => id !== organizerId));
			} else {
				await api.post(`/participant/following/${organizerId}`);
				setFollowingIds((prev) => [...prev, organizerId]);
			}
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Action failed",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setActionId(null);
		}
	};

	if(loading) {
		return <div className="grid place-items-center py-10">Loading organizers...</div>;
	}

	return (
		<div className="space-y-4">
			<h1 className="text-2xl font-semibold">Clubs / Organizers</h1>
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				{organizers.map((organizer) => {
					const isFollowing = followingIds.includes(organizer._id);
					return (
						<Card key={organizer._id}>
							<CardHeader>
								<CardTitle>{organizer.name}</CardTitle>
								<CardDescription>{organizer.category}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-1 text-sm">
								<div>{organizer.description || "No description"}</div>
								<div>{organizer.contactEmail}</div>
							</CardContent>
							<CardFooter>
								<div className="flex items-center gap-2">
									<Button asChild variant="outline">
										<Link to={`/participant/organizers/${organizer._id}`}>Details</Link>
									</Button>
									<Button
										variant="outline"
										onClick={() => toggleFollow(organizer._id, isFollowing)}
										disabled={actionId === organizer._id}
									>
										{actionId === organizer._id
											? "Updating..."
											: isFollowing
												? "Unfollow"
												: "Follow"}
									</Button>
								</div>
							</CardFooter>
						</Card>
					);
				})}
			</div>
		</div>
	);
};

export default ParticipantOrganizers;
