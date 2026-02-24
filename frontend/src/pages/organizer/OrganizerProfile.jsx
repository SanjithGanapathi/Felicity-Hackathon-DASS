import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ORGANIZER_CATEGORIES } from "@/features/shared/constants/categories";
import {
	fetchOrganizerProfile,
	updateOrganizerProfile,
} from "@/features/organizer/services/organizerProfile.service";

const OrganizerProfile = () => {
	const [form, setForm] = useState({
		name: "",
		category: "",
		description: "",
		contactEmail: "",
		contactNumber: "",
		discordWebhookUrl: "",
		loginEmail: "",
	});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const { toast } = useToast();

	useEffect(() => {
		const loadProfile = async () => {
			try {
				const profileData = await fetchOrganizerProfile();
				setForm({
					name: profileData.name || "",
					category: profileData.category || "",
					description: profileData.description || "",
					contactEmail: profileData.contactEmail || "",
					contactNumber: profileData.contactNumber || "",
					discordWebhookUrl: profileData.discordWebhookUrl || "",
					loginEmail: profileData.loginEmail || "",
				});
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch organizer profile",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setLoading(false);
			}
		};

		loadProfile();
	}, []);

	const handleChange = (event) => {
		const { id, value } = event.target;
		setForm((prev) => ({ ...prev, [id]: value }));
	};

	const saveProfile = async () => {
		setSaving(true);
		try {
			await updateOrganizerProfile({
				name: form.name,
				category: form.category,
				description: form.description,
				contactEmail: form.contactEmail,
				contactNumber: form.contactNumber,
				discordWebhookUrl: form.discordWebhookUrl,
			});
			toast({
				title: "Organizer profile updated",
				description: "Your profile changes were saved.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to update organizer profile",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setSaving(false);
		}
	};

	if(loading) {
		return <div className="grid place-items-center py-10">Loading profile...</div>;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Organizer Profile</CardTitle>
				<CardDescription>Update organizer details and optional Discord webhook.</CardDescription>
			</CardHeader>
			<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2">
					<Label htmlFor="name">Name</Label>
					<Input id="name" value={form.name} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="category">Category</Label>
					<select
						id="category"
						value={form.category}
						onChange={handleChange}
						className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Select category</option>
						{ORGANIZER_CATEGORIES.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="description">Description</Label>
					<Input id="description" value={form.description} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="contactEmail">Contact Email</Label>
					<Input id="contactEmail" value={form.contactEmail} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="contactNumber">Contact Number</Label>
					<Input id="contactNumber" value={form.contactNumber} onChange={handleChange} />
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="loginEmail">Login Email (non-editable)</Label>
					<Input id="loginEmail" value={form.loginEmail} disabled />
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="discordWebhookUrl">Discord Webhook URL</Label>
					<Input
						id="discordWebhookUrl"
						value={form.discordWebhookUrl}
						onChange={handleChange}
						placeholder="https://discord.com/api/webhooks/..."
					/>
				</div>
			</CardContent>
			<CardFooter>
				<Button onClick={saveProfile} disabled={saving}>
					{saving ? "Saving..." : "Save Profile"}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default OrganizerProfile;
