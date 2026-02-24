import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";
import { INTEREST_OPTIONS } from "@/features/shared/constants/categories";

const Onboarding = () => {
	const navigate = useNavigate();
	const [loading, setLoading] = useState(false);
	const [selectedInterests, setSelectedInterests] = useState([]);
	const [organizers, setOrganizers] = useState([]);
	const [selectedOrganizers, setSelectedOrganizers] = useState([]);
	const [loadingOrganizers, setLoadingOrganizers] = useState(true);
	const { toast } = useToast();

	// fetch available organizers on mount
	useEffect(() => {
		const fetchOrganizers = async () => {
			try {
				const response = await api.get("/participant/organizers");
				setOrganizers(response.data || []);
			} catch (err) {
				// silently fail — organizer list is optional during onboarding
			} finally {
				setLoadingOrganizers(false);
			}
		};
		fetchOrganizers();
	}, []);

	const handleInterestChange = (interest) => {
		setSelectedInterests((prev) =>
			prev.includes(interest)
				? prev.filter((item) => item !== interest)
				: [...prev, interest]
		);
	};

	const handleOrganizerToggle = (organizerId) => {
		setSelectedOrganizers((prev) =>
			prev.includes(organizerId)
				? prev.filter((id) => id !== organizerId)
				: [...prev, organizerId]
		);
	};

	// save both interests and followed organizers
	const savePreferences = async () => {
		setLoading(true);
		try {
			// save interests
			await api.put("/participant/me", {
				interests: selectedInterests,
			});

			// follow selected organizers
			for (const organizerId of selectedOrganizers) {
				await api.post(`/participant/following/${organizerId}`);
			}

			navigate("/participant/dashboard");
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to save onboarding preferences",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	// if the user wants to skip the onboarding
	const skipOnboarding = () => {
		navigate("/participant/dashboard");
	};

	return (
		<div className="grid place-items-center py-8">
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Welcome to Felicity</CardTitle>
					<CardDescription>Select your interests and organizers to follow. You can change these later from your Profile.</CardDescription>
				</CardHeader>

				<CardContent className="space-y-6">
					<div className="space-y-3">
						<div className="font-medium">Select Interests</div>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							{INTEREST_OPTIONS.map((interest) => (
								<div key={interest} className="flex items-center gap-2">
									<Checkbox
										id={`interest-${interest}`}
										checked={selectedInterests.includes(interest)}
										onCheckedChange={() => handleInterestChange(interest)}
									/>
									<Label htmlFor={`interest-${interest}`}>{interest}</Label>
								</div>
							))}
						</div>
					</div>

					<div className="space-y-3">
						<div className="font-medium">Follow Organizers / Clubs</div>
						{loadingOrganizers ? (
							<div className="text-sm text-muted-foreground">Loading organizers...</div>
						) : organizers.length === 0 ? (
							<div className="text-sm text-muted-foreground">No organizers available yet.</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
								{organizers.map((org) => (
									<div key={org._id} className="flex items-center gap-2">
										<Checkbox
											id={`org-${org._id}`}
											checked={selectedOrganizers.includes(org._id)}
											onCheckedChange={() => handleOrganizerToggle(org._id)}
										/>
										<Label htmlFor={`org-${org._id}`}>
											{org.name} <span className="text-muted-foreground text-xs">({org.category})</span>
										</Label>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>

				<CardFooter className="flex gap-2">
					<Button onClick={savePreferences} disabled={loading}>
						{loading ? "Saving..." : "Save & Continue"}
					</Button>
					<Button variant="outline" onClick={skipOnboarding} disabled={loading}>
						Skip for now
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
};

export default Onboarding;
