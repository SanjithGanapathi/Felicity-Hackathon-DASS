import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import {
	EVENT_CATEGORIES,
	EVENT_TYPE_OPTIONS,
	ELIGIBILITY_OPTIONS,
} from "@/features/shared/constants/categories";

const OrganizerCreateEvent = () => {
	const [form, setForm] = useState({
		name: "",
		description: "",
		eventType: "normal",
		eligibility: "all",
		registrationDeadline: "",
		registrationDeadlineTime: "23:59",
		startDate: "",
		startTime: "00:00",
		endDate: "",
		endTime: "00:00",
		registrationLimit: "0",
		registrationFee: "0",
		status: "draft",
		venue: "",
		categoryTag: "",
		isTeamEvent: false,
		minTeamSize: "2", // hardcoding the min and max team size
		maxTeamSize: "4",
	});
	const [loading, setLoading] = useState(false);
	const [formSchema, setFormSchema] = useState([]);
	const [merchItems, setMerchItems] = useState([]);
	const navigate = useNavigate();
	const { toast } = useToast();

	// if any of the id value changes then spread the exisiting state and add the changed input field value
	const handleChange = (event) => {
		const { id, value } = event.target;
		setForm((prev) => ({ ...prev, [id]: value }));
	};

	const handleTeamEventChange = (checked) => {
		setForm((prev) => ({
			...prev,
			isTeamEvent: Boolean(checked),
		}));
	};

	const addFormField = () => {
		setFormSchema((prev) => ([
			...prev,
			{ label: "", fieldType: "text", required: false, optionsText: "" },
		]));
	};

	const updateFormField = (index, key, value) => {
		setFormSchema((prev) => prev.map((field, fieldIndex) => {
			if(fieldIndex !== index) {
				return field;
			}
			return { ...field, [key]: value };
		}));
	};

	const removeFormField = (index) => {
		setFormSchema((prev) => prev.filter((_, fieldIndex) => fieldIndex !== index));
	};

	const moveFormField = (index, direction) => {
		setFormSchema((prev) => {
			const targetIndex = index + direction;
			if(targetIndex < 0 || targetIndex >= prev.length) {
				return prev;
			}
			const next = [...prev];
			[next[index], next[targetIndex]] = [next[targetIndex], next[index]];
			return next;
		});
	};

	const addMerchItem = () => {
		setMerchItems((prev) => ([
			...prev,
			{ name: "", price: "0", stock: "0", variantsText: "", limitPerUser: "1" },
		]));
	};

	const updateMerchItem = (index, key, value) => {
		setMerchItems((prev) => prev.map((item, itemIndex) => {
			if(itemIndex !== index) {
				return item;
			}
			return { ...item, [key]: value };
		}));
	};

	const removeMerchItem = (index) => {
		setMerchItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
	};

	const normalizeDateValue = (dateValue, timeValue = "00:00") => {
		// convert date and time value into datetime-local format expected by backend flow
		if(!dateValue) {
			return "";
		}
		const normalizedTime = timeValue && /^\d{2}:\d{2}$/.test(timeValue) ? timeValue : "00:00";
		return `${dateValue}T${normalizedTime}`;
	};

	const toDateInputValue = (value) => {
		if(!value) {
			return "";
		}
		return value;
	};

	const createEvent = async () => {
		const normalizedRegistrationDeadline = normalizeDateValue(
			toDateInputValue(form.registrationDeadline),
			form.registrationDeadlineTime,
		);
		const normalizedStartDate = normalizeDateValue(toDateInputValue(form.startDate), form.startTime);
		const normalizedEndDate = normalizeDateValue(toDateInputValue(form.endDate), form.endTime);

		// validate required fields before calling backend api
		if(!normalizedRegistrationDeadline) {
			toast({
				variant: "destructive",
				title: "Missing registration deadline",
				description: "Please select a registration deadline.",
			});
			return;
		}
		if(Number(form.registrationFee) < 0) {
			toast({
				variant: "destructive",
				title: "Invalid registration fee",
				description: "Registration fee cannot be negative.",
			});
			return;
		}

		setLoading(true);
		try {
			const normalizedFormSchema = formSchema
				.map((field) => ({
					label: field.label.trim(),
					fieldType: field.fieldType,
					required: Boolean(field.required),
					options: field.fieldType === "dropdown"
						? field.optionsText.split(",").map((item) => item.trim()).filter(Boolean)
						: [],
				}))
				.filter((field) => field.label.length > 0);

			const normalizedMerchItems = merchItems
				.map((item) => ({
					name: item.name.trim(),
					price: Number(item.price),
					stock: Number(item.stock),
					variants: item.variantsText.split(",").map((variant) => variant.trim()).filter(Boolean),
					limitPerUser: Number(item.limitPerUser),
				}))
				.filter((item) => item.name.length > 0);

			await api.post("/events", {
				name: form.name,
				description: form.description,
				eventType: form.eventType,
				eligibility: form.eligibility,
				tags: form.categoryTag ? [form.categoryTag] : [],
				registrationDeadline: normalizedRegistrationDeadline,
				startDate: normalizedStartDate || undefined,
				endDate: normalizedEndDate || undefined,
				registrationLimit: Number(form.registrationLimit),
				registrationFee: Number(form.registrationFee),
				status: form.status,
				venue: form.venue || undefined,
				isTeamEvent: form.isTeamEvent,
				minTeamSize: form.isTeamEvent ? Number(form.minTeamSize) : undefined,
				maxTeamSize: form.isTeamEvent ? Number(form.maxTeamSize) : undefined,
				formSchema: normalizedFormSchema,
				merchItems: form.eventType === "merchandise" ? normalizedMerchItems : [],
			});

			toast({
				title: "Event created",
				description: "Your event has been saved.",
			});
			navigate("/organizer/dashboard");
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to create event",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create Event</CardTitle>
				<CardDescription>Create a new organizer event.</CardDescription>
			</CardHeader>
			<CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="name">Name</Label>
					<Input id="name" value={form.name} onChange={handleChange} />
				</div>
				<div className="space-y-2 md:col-span-2">
					<Label htmlFor="description">Description</Label>
					<Input id="description" value={form.description} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="eventType">Event Type</Label>
					<select
						id="eventType"
						value={form.eventType}
						onChange={handleChange}
						className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{EVENT_TYPE_OPTIONS.map((eventType) => (
							<option key={eventType.value} value={eventType.value}>
								{eventType.label}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="eligibility">Eligibility</Label>
					<select
						id="eligibility"
						value={form.eligibility}
						onChange={handleChange}
						className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						{ELIGIBILITY_OPTIONS.map((eligibilityOption) => (
							<option key={eligibilityOption.value} value={eligibilityOption.value}>
								{eligibilityOption.label}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="categoryTag">Category</Label>
					<select
						id="categoryTag"
						value={form.categoryTag}
						onChange={handleChange}
						className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Select category</option>
						{EVENT_CATEGORIES.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
				</div>
				<div className="space-y-2">
					<Label htmlFor="registrationDeadline">Registration Deadline</Label>
					<Input id="registrationDeadline" type="date" value={form.registrationDeadline} onChange={handleChange} required />
				</div>
				<div className="space-y-2">
					<Label htmlFor="registrationDeadlineTime">Registration Deadline Time</Label>
					<Input id="registrationDeadlineTime" type="time" value={form.registrationDeadlineTime} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="startDate">Start Date</Label>
					<Input id="startDate" type="date" value={form.startDate} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="startTime">Start Time</Label>
					<Input id="startTime" type="time" value={form.startTime} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="endDate">End Date</Label>
					<Input id="endDate" type="date" value={form.endDate} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="endTime">End Time</Label>
					<Input id="endTime" type="time" value={form.endTime} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="venue">Venue</Label>
					<Input id="venue" value={form.venue} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="registrationLimit">Registration Limit</Label>
					<Input id="registrationLimit" type="number" min="0" value={form.registrationLimit} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="registrationFee">Registration Fee</Label>
					<Input id="registrationFee" type="number" min="0" value={form.registrationFee} onChange={handleChange} />
				</div>
				<div className="space-y-2">
					<Label htmlFor="status">Status</Label>
					<select
						id="status"
						value={form.status}
						onChange={handleChange}
						className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="draft">Draft</option>
						<option value="published">Published</option>
					</select>
				</div>
				<div className="space-y-2 md:col-span-2">
					<div className="flex items-center gap-2">
						<Checkbox id="isTeamEvent" checked={form.isTeamEvent} onCheckedChange={handleTeamEventChange} />
						<Label htmlFor="isTeamEvent">Enable team registration (hackathon mode)</Label>
					</div>
				</div>
				{form.isTeamEvent ? (
					<>
						<div className="space-y-2">
							<Label htmlFor="minTeamSize">Min Team Size</Label>
							<Input id="minTeamSize" type="number" value={form.minTeamSize} onChange={handleChange} min="2" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="maxTeamSize">Max Team Size</Label>
							<Input id="maxTeamSize" type="number" value={form.maxTeamSize} onChange={handleChange} min="2" />
						</div>
					</>
				) : null}
				{form.eventType === "normal" ? (
					<div className="space-y-3 md:col-span-2 border rounded-md p-3">
						<div className="font-medium">Registration Form Builder</div>
						{formSchema.length === 0 ? <div className="text-sm">No custom fields added.</div> : null}
						{formSchema.map((field, index) => (
							<div key={`${field.fieldType}-${index}`} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
								<div className="space-y-1 md:col-span-2">
									<Label>Label</Label>
									<Input
										value={field.label}
										onChange={(e) => updateFormField(index, "label", e.target.value)}
										placeholder="field label"
									/>
								</div>
								<div className="space-y-1">
									<Label>Type</Label>
									<select
										value={field.fieldType}
										onChange={(e) => updateFormField(index, "fieldType", e.target.value)}
										className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
									>
										<option value="text">text</option>
										<option value="number">number</option>
										<option value="dropdown">dropdown</option>
										<option value="checkbox">checkbox</option>
										<option value="file">file</option>
									</select>
								</div>
								<div className="space-y-1 flex items-center gap-2">
									<Checkbox
										checked={field.required}
										onCheckedChange={(checked) => updateFormField(index, "required", Boolean(checked))}
									/>
									<Label>required</Label>
								</div>
								{field.fieldType === "dropdown" ? (
									<div className="space-y-1 md:col-span-3">
										<Label>Options (comma separated)</Label>
										<Input
											value={field.optionsText}
											onChange={(e) => updateFormField(index, "optionsText", e.target.value)}
											placeholder="option1, option2"
										/>
									</div>
								) : null}
								<div>
									<div className="flex items-center gap-2">
										<Button type="button" variant="outline" onClick={() => moveFormField(index, -1)}>
											Up
										</Button>
										<Button type="button" variant="outline" onClick={() => moveFormField(index, 1)}>
											Down
										</Button>
										<Button type="button" variant="outline" onClick={() => removeFormField(index)}>
											Remove
										</Button>
									</div>
								</div>
							</div>
						))}
						<Button type="button" variant="outline" onClick={addFormField}>
							Add Field
						</Button>
					</div>
				) : null}
				{form.eventType === "merchandise" ? (
					<div className="space-y-3 md:col-span-2 border rounded-md p-3">
						<div className="font-medium">Merchandise Item Builder</div>
						{merchItems.length === 0 ? <div className="text-sm">No merchandise items added.</div> : null}
						{merchItems.map((item, index) => (
							<div key={`merch-item-${index}`} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
								<div className="space-y-1">
									<Label>Name</Label>
									<Input
										value={item.name}
										onChange={(e) => updateMerchItem(index, "name", e.target.value)}
										placeholder="item name"
									/>
								</div>
								<div className="space-y-1">
									<Label>Price</Label>
									<Input
										type="number"
										min="0"
										value={item.price}
										onChange={(e) => updateMerchItem(index, "price", e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label>Stock</Label>
									<Input
										type="number"
										min="0"
										value={item.stock}
										onChange={(e) => updateMerchItem(index, "stock", e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Label>Limit / User</Label>
									<Input
										type="number"
										min="1"
										value={item.limitPerUser}
										onChange={(e) => updateMerchItem(index, "limitPerUser", e.target.value)}
									/>
								</div>
								<div className="space-y-1">
									<Button type="button" variant="outline" onClick={() => removeMerchItem(index)}>
										Remove
									</Button>
								</div>
								<div className="space-y-1 md:col-span-5">
									<Label>Variants (comma separated)</Label>
									<Input
										value={item.variantsText}
										onChange={(e) => updateMerchItem(index, "variantsText", e.target.value)}
										placeholder="S, M, L or Red, Blue"
									/>
								</div>
							</div>
						))}
						<Button type="button" variant="outline" onClick={addMerchItem}>
							Add Merchandise Item
						</Button>
					</div>
				) : null}
			</CardContent>
			<CardFooter>
				<Button onClick={createEvent} disabled={loading}>
					{loading ? "Creating..." : "Create Event"}
				</Button>
			</CardFooter>
		</Card>
	);
};

export default OrganizerCreateEvent;
