import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ORGANIZER_CATEGORIES } from "@/features/shared/constants/categories";
import {
	fetchAdminOrganizers,
	createAdminOrganizer,
	removeAdminOrganizer,
	updateAdminOrganizerStatus,
} from "@/features/admin/services/adminOrganizers.service";

const AdminOrganizers = () => {
	const [organizers, setOrganizers] = useState([]);
	// state of all deleted organizer ids for conditional render
	const [deletedOrganizerIds, setDeletedOrganizerIds] = useState([]);
	
	// set of states to render to loading states
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const [deletingId, setDeletingId] = useState(null);
	const [statusUpdatingId, setStatusUpdatingId] = useState(null);
	// state to set the credentials
	const [credentials, setCredentials] = useState(null);
	// render the form as the user types
	const [form, setForm] = useState({
		name: "",
		contactEmail: "",
		contactNumber: "",
		category: "",
		description: "",
	});
	const { toast } = useToast();

	// fetch the organizers and store it in organizers state var
	const fetchOrganizers = async () => {
		setLoading(true);
		try {
			const organizersData = await fetchAdminOrganizers();
			setOrganizers(organizersData || []);
			setDeletedOrganizerIds([]);
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

	const changeOrganizerStatus = async (organizerId, status) => {
		setStatusUpdatingId(organizerId);
		try {
			await updateAdminOrganizerStatus(organizerId, status);
			setOrganizers((prev) => prev.map((organizer) => (
				organizer._id === organizerId
					? { ...organizer, status }
					: organizer
			)));
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to update organizer status",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setStatusUpdatingId(null);
		}
	};

	// load the organizers only once when the component mounts the dom
	useEffect(() => {
		fetchOrganizers();
	}, []);

	// if any field changes then 
	const handleChange = (event) => {
		const { id, value } = event.target;
		setForm((prev) => ({ ...prev, [id]: value }));
	};

	const createOrganizer = async () => {
		setCreating(true);
		try {
			const responseData = await createAdminOrganizer(form);
			setCredentials(responseData.credentials || null);
			setForm({
				name: "",
				contactEmail: "",
				contactNumber: "",
				category: "",
				description: "",
			});
			await fetchOrganizers();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to create organizer",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setCreating(false);
		}
	};

	const removeOrganizer = async (organizerId) => {
		setDeletingId(organizerId);
		try {
			await removeAdminOrganizer(organizerId);
			setDeletedOrganizerIds((prev) =>
				prev.includes(organizerId) ? prev : [...prev, organizerId]
			);
		} catch (err) {
			if(err.response?.status === 404) {
				setDeletedOrganizerIds((prev) =>
					prev.includes(organizerId) ? prev : [...prev, organizerId]
				);
			}
			toast({
				variant: "destructive",
				title: "Failed to remove organizer",
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
					<CardTitle>Create Organizer</CardTitle>
					<CardDescription>Add new club/organizer account</CardDescription>
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
					<div className="space-y-2">
						<Label htmlFor="contactEmail">Contact Email</Label>
						<Input id="contactEmail" value={form.contactEmail} onChange={handleChange} />
					</div>
					<div className="space-y-2">
						<Label htmlFor="contactNumber">Contact Number</Label>
						<Input id="contactNumber" value={form.contactNumber} onChange={handleChange} />
					</div>
					<div className="space-y-2 md:col-span-2">
						<Label htmlFor="description">Description</Label>
						<Input id="description" value={form.description} onChange={handleChange} />
					</div>
				</CardContent>
				<CardFooter>
					<Button onClick={createOrganizer} disabled={creating}>
						{creating ? "Creating..." : "Create Organizer"}
					</Button>
				</CardFooter>
			</Card>

			{credentials && (
				<Card>
					<CardHeader>
						<CardTitle>Generated Credentials</CardTitle>
					</CardHeader>
					<CardContent className="space-y-1 text-sm">
						<div>Login Email: {credentials.loginEmail}</div>
						<div>Password: {credentials.password}</div>
						<div>{credentials.note}</div>
					</CardContent>
				</Card>
			)}

			<Card>
				<CardHeader>
					<CardTitle>Organizers</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{loading ? (
						<div>Loading organizers...</div>
					) : organizers.length === 0 ? (
						<div>No organizers found</div>
					) : (
						organizers.map((organizer) => (
							<div key={organizer._id} className="border rounded-md p-3 flex items-center justify-between">
								<div className="space-y-1 text-sm">
									<div>{organizer.name}</div>
									<div>{organizer.category}</div>
									<div>{organizer.accountId?.email || organizer.contactEmail}</div>
									<div>Status: {organizer.status || "active"}</div>
								</div>
								<div className="flex items-center gap-2">
									<select
										value={organizer.status || "active"}
										onChange={(e) => changeOrganizerStatus(organizer._id, e.target.value)}
										className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
										disabled={statusUpdatingId === organizer._id || deletedOrganizerIds.includes(organizer._id)}
									>
										<option value="active">Active</option>
										<option value="disabled">Disabled</option>
										<option value="archived">Archived</option>
									</select>
									{deletedOrganizerIds.includes(organizer._id) ? (
										<Button variant="outline" disabled>
											Removed
										</Button>
									) : (
										<Button
											variant="outline"
											onClick={() => removeOrganizer(organizer._id)}
											disabled={deletingId === organizer._id}
										>
											{deletingId === organizer._id ? "Removing..." : "Delete"}
										</Button>
									)}
								</div>
							</div>
						))
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export default AdminOrganizers;
