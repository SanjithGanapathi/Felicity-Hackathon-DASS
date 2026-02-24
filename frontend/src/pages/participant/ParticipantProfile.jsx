import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import { INTEREST_OPTIONS } from "@/features/shared/constants/categories";

const ParticipantProfile = () => {
	// state to update profile data
	const [profile, setProfile] = useState({
		firstName: "",
		lastName: "",
		email: "",
		participantType: "",
		collegeOrOrg: "",
		contactNumber: "",
		interests: [],
	});

	// state to change password
	const [passwordForm, setPasswordForm] = useState({
		currentPassword: "",
		newPassword: "",
	});

	// states to denote loading and saving status
	const [loading, setLoading] = useState(true);
	const [savingProfile, setSavingProfile] = useState(false);
	const [savingPassword, setSavingPassword] = useState(false);
	const { toast } = useToast();

	// fetch the profile once this component mounts on the dom
	useEffect(() => {
		const fetchProfile = async () => {
			try {
				const response = await api.get("/participant/me");
				const user = response.data;
				setProfile({
					firstName: user.firstName || "",
					lastName: user.lastName || "",
					email: user.email || "",
					participantType: user.participantProfile?.participantType || "",
					collegeOrOrg: user.participantProfile?.collegeOrOrg || "",
					contactNumber: user.participantProfile?.contactNumber || "",
					interests: user.participantProfile?.interests || [],
				});
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch profile",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setLoading(false);
			}
		};

		fetchProfile();
	}, []);

	// save the profie using a put request to the backend
	const saveProfile = async () => {
		setSavingProfile(true);
		try {
			await api.put("/participant/me", {
				firstName: profile.firstName,
				lastName: profile.lastName,
				collegeOrOrg: profile.collegeOrOrg,
				contactNumber: profile.contactNumber,
				interests: profile.interests,
			});
			toast({
				title: "Profile updated",
				description: "Your profile changes were saved.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Profile update failed",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setSavingProfile(false);
		}
	};

	// save the new password using a put request to the backend
	const savePassword = async () => {
		setSavingPassword(true);
		try {
			await api.put("/participant/me/password", passwordForm);
			toast({
				title: "Password updated",
				description: "Your password has been changed.",
			});
			setPasswordForm({ currentPassword: "", newPassword: "" });
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Password update failed",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setSavingPassword(false);
		}
	};

	if(loading) {
		return <div className="grid place-items-center py-10">Loading profile...</div>;
	}

	return (
		<div className="space-y-4">
			<Card>
				<CardHeader>
					<CardTitle>Profile</CardTitle>
					<CardDescription>Update your participant details.</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="firstName">First Name</Label>
						<Input
							id="firstName"
							value={profile.firstName}
							onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="lastName">Last Name</Label>
						<Input
							id="lastName"
							value={profile.lastName}
							onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="email">Email</Label>
						<Input id="email" value={profile.email} disabled />
					</div>
					<div className="space-y-2">
						<Label htmlFor="participantType">Participant Type</Label>
						<Input id="participantType" value={profile.participantType} disabled />
					</div>
					<div className="space-y-2">
						<Label htmlFor="collegeOrOrg">College / Organization</Label>
						<Input
							id="collegeOrOrg"
							value={profile.collegeOrOrg}
							onChange={(e) => setProfile((prev) => ({ ...prev, collegeOrOrg: e.target.value }))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="contactNumber">Contact Number</Label>
						<Input
							id="contactNumber"
							value={profile.contactNumber}
							onChange={(e) => setProfile((prev) => ({ ...prev, contactNumber: e.target.value }))}
						/>
					</div>
					<div className="space-y-2 md:col-span-2">
						<Label>Interests</Label>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
							{INTEREST_OPTIONS.map((interest) => {
								const isChecked = profile.interests.includes(interest);
								return (
									<label key={interest} className="flex items-center gap-2 text-sm">
										<input
											type="checkbox"
											checked={isChecked}
											onChange={(e) => {
												setProfile((prev) => {
													const existing = Array.isArray(prev.interests) ? prev.interests : [];
													const nextInterests = e.target.checked
														? [...existing, interest]
														: existing.filter((value) => value !== interest);
													return { ...prev, interests: nextInterests };
												});
											}}
										/>
										{interest}
									</label>
								);
							})}
						</div>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={saveProfile} disabled={savingProfile}>
						{savingProfile ? "Saving..." : "Save Profile"}
					</Button>
				</CardFooter>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Change Password</CardTitle>
					<CardDescription>Update your login password.</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div className="space-y-2">
						<Label htmlFor="currentPassword">Current Password</Label>
						<Input
							id="currentPassword"
							type="password"
							value={passwordForm.currentPassword}
							onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="newPassword">New Password</Label>
						<Input
							id="newPassword"
							type="password"
							value={passwordForm.newPassword}
							onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
						/>
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={savePassword} disabled={savingPassword}>
						{savingPassword ? "Saving..." : "Update Password"}
					</Button>
				</CardFooter>
			</Card>
		</div>
	);
};

export default ParticipantProfile;
