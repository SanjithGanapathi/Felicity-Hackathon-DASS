import { useState } from "react";
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
	const { toast } = useToast();

	const handleCheckboxChange = (interest) => {
		setSelectedInterests((prev) =>
			prev.includes(interest)
				? prev.filter((item) => item !== interest)
				: [...prev, interest]
		);
	};

	// save the interests that have been set in the state var selectedInterests
	const saveInterests = async () => {
		setLoading(true);
		try {
			await api.put("/participant/me", {
				interests: selectedInterests,
			});
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
					<CardTitle>Select Interests</CardTitle>
					<CardDescription>You can skip and configure these later from Profile.</CardDescription>
				</CardHeader>

				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
					{INTEREST_OPTIONS.map((interest) => (
						<div key={interest} className="flex items-center gap-2">
							<Checkbox
								id={interest}
								checked={selectedInterests.includes(interest)}
								onCheckedChange={() => handleCheckboxChange(interest)}
							/>
							<Label htmlFor={interest}>{interest}</Label>
						</div>
					))}
				</CardContent>

				<CardFooter className="flex gap-2">
					<Button onClick={saveInterests} disabled={loading}>
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
