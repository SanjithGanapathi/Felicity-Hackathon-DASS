import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
	fetchEventById,
	fetchCurrentUser as fetchCurrentUserProfile,
	fetchMyRegistrations as fetchParticipantRegistrations,
	fetchMyTeam as fetchParticipantTeam,
	registerForNormalEvent,
	createTeamForEvent,
	joinTeamByCode,
	rejectTeamInviteByCode,
	fetchMerchOrdersByEvent,
	createMerchOrder as createParticipantMerchOrder,
	submitMerchPaymentProof,
} from "@/features/participant/services/participantEventDetails.service";
import { formatEnumLabel } from "@/features/shared/constants/categories";

const ParticipantEventDetails = () => {
	const { id } = useParams();
	const [event, setEvent] = useState(null);
	const [loading, setLoading] = useState(true);
	const [registering, setRegistering] = useState(false);
	const [formAnswers, setFormAnswers] = useState({});
	const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

	// state vars for team details
	const [team, setTeam] = useState(null);
	const [teamLoading, setTeamLoading] = useState(false);
	const [teamSubmitting, setTeamSubmitting] = useState(false);
	const [teamName, setTeamName] = useState("");
	const [teamSize, setTeamSize] = useState("2");
	const [inviteEmails, setInviteEmails] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [currentUser, setCurrentUser] = useState(null);

	// state vars for merchandise order flow
	const [merchOrderForm, setMerchOrderForm] = useState({
		itemName: "",
		variant: "",
		quantity: "1",
		paymentProofUrl: "",
	});
	const [merchOrders, setMerchOrders] = useState([]);
	const [merchLoading, setMerchLoading] = useState(false);
	const [merchSubmitting, setMerchSubmitting] = useState(false);
	const [proofSubmittingOrderId, setProofSubmittingOrderId] = useState(null);
	const [proofInputs, setProofInputs] = useState({});
	const { toast } = useToast();

	// get the event by id 
	useEffect(() => {
		const fetchEvent = async () => {
			try {
				const eventData = await fetchEventById(id);
				setEvent(eventData);
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch event",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setLoading(false);
			}
		};

		fetchEvent();
	}, [id]);

	// fetch participant identity to evaluate invite state for team registration
	useEffect(() => {
		const fetchCurrentUser = async () => {
			try {
				const currentUserData = await fetchCurrentUserProfile();
				setCurrentUser(currentUserData);
			} catch (err) {
			}
		};

		fetchCurrentUser();
	}, []);

	useEffect(() => {
		const fetchRegistrationState = async () => {
			try {
				const buckets = await fetchParticipantRegistrations();
				const allRegistrations = [
					...(buckets.upcoming || []),
					...(buckets.normal || []),
					...(buckets.merchandise || []),
					...(buckets.completed || []),
					...(buckets.cancelled || []),
				];
				const registered = allRegistrations.some((registration) => registration.eventId?._id === id);
				setIsAlreadyRegistered(registered);
			} catch (err) {
				setIsAlreadyRegistered(false);
			}
		};

		fetchRegistrationState();
	}, [id]);

	// fetch the participants in the team. post to the backend
	const fetchMyTeam = async () => {
		setTeamLoading(true);
		try {
			const teamData = await fetchParticipantTeam(id);
			setTeam(teamData.team || null);
			if (teamData.team?.inviteCode) {
				setInviteCode(teamData.team.inviteCode);
			}
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch team info",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setTeamLoading(false);
		}
	};

	// render once mounts and if the id changes or the event type changes
	useEffect(() => {
		if (event?.isTeamEvent) {
			fetchMyTeam();
		}
	}, [event?.isTeamEvent, id]);

	// set default merch item and fetch my merchandise orders for the event
	useEffect(() => {
		const initializeMerchEvent = async () => {
			if (event?.eventType !== "merchandise") {
				return;
			}

			const firstItem = event.merchItems?.[0];
			setMerchOrderForm({
				itemName: firstItem?.name || "",
				variant: firstItem?.variants?.[0] || "",
				quantity: "1",
				paymentProofUrl: "",
			});

			setMerchLoading(true);
			try {
				const merchOrdersData = await fetchMerchOrdersByEvent(id);
				setMerchOrders(merchOrdersData || []);
			} catch (err) {
				toast({
					variant: "destructive",
					title: "Failed to fetch your orders",
					description: err.response?.data?.message || "Please try again.",
				});
			} finally {
				setMerchLoading(false);
			}
		};

		initializeMerchEvent();
	}, [event?.eventType, id]);

	// register for event by id
	const registerForEvent = async () => {
		setRegistering(true);
		try {
			const formResponses = (event.formSchema || []).map((field) => ({
				question: field.label,
				answer: formAnswers[field.label] ?? (field.fieldType === "checkbox" ? [] : ""),
			}));
			await registerForNormalEvent(id, { formResponses });
			setIsAlreadyRegistered(true);
			toast({
				title: "Registered successfully",
				description: "Your registration has been recorded.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Registration failed",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setRegistering(false);
		}
	};

	// return the invite emails after trimming and filtering out zero len emails
	const parseInviteEmails = () => {
		if (!inviteEmails.trim()) {
			return [];
		}
		return inviteEmails
			.split(",")
			.map((email) => email.trim())
			.filter((email) => email.length > 0);
	};

	// send a request to create a team and set the invite code
	const createTeam = async () => {
		setTeamSubmitting(true);
		try {
			const responseData = await createTeamForEvent(id, {
				teamName,
				teamSize: Number(teamSize),
				inviteEmails: parseInviteEmails(),
				formResponses: (event.formSchema || []).map((field) => ({
					question: field.label,
					answer: formAnswers[field.label] ?? (field.fieldType === "checkbox" ? [] : ""),
				})),
			});
			setTeam(responseData.team);
			setInviteCode(responseData.team?.inviteCode || "");
			toast({
				title: "Team created",
				description: "Invite code generated successfully.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to create team",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setTeamSubmitting(false);
		}
	};

	// send a post request to reject team by code
	const joinByCode = async () => {
		setTeamSubmitting(true);
		try {
			const responseData = await joinTeamByCode(id, inviteCode);
			setTeam(responseData.team);
			toast({
				title: "Team joined",
				description: "You have joined the team successfully.",
			});
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to join team",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setTeamSubmitting(false);
		}
	};

	// send a post request to reject team by code
	const rejectInviteByCode = async () => {
		setTeamSubmitting(true);
		try {
			await rejectTeamInviteByCode(id);
			toast({
				title: "Invite rejected",
				description: "Your response has been recorded.",
			});
			await fetchMyTeam();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to reject invite",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setTeamSubmitting(false);
		}
	};

	// fetch all the merch orders for the given user
	const fetchMerchOrders = async () => {
		setMerchLoading(true);
		try {
			const merchOrdersData = await fetchMerchOrdersByEvent(id);
			setMerchOrders(merchOrdersData || []);
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to fetch your orders",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setMerchLoading(false);
		}
	};

	// if any merch field changes then spread it and add the item
	const handleMerchItemChange = (selectedItemName) => {
		const selectedItem = (event?.merchItems || []).find((item) => item.name === selectedItemName);
		setMerchOrderForm((prev) => ({
			...prev,
			itemName: selectedItemName,
			variant: selectedItem?.variants?.[0] || "",
		}));
	};

	// submit merch order request
	const createMerchOrder = async () => {
		setMerchSubmitting(true);
		try {
			await createParticipantMerchOrder({
				eventId: id,
				itemName: merchOrderForm.itemName,
				variant: merchOrderForm.variant,
				quantity: Number(merchOrderForm.quantity),
				paymentProofUrl: merchOrderForm.paymentProofUrl.trim() || undefined,
			});
			toast({
				title: "Order created",
				description: "Your order is now awaiting payment proof/approval.",
			});
			setMerchOrderForm((prev) => ({ ...prev, quantity: "1", paymentProofUrl: "" }));
			await fetchMerchOrders();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to create order",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setMerchSubmitting(false);
		}
	};

	// add the payment proof url and then send a patch request 
	const submitProofForOrder = async (orderId) => {
		const paymentProofUrl = (proofInputs[orderId] || "").trim();
		if (!paymentProofUrl) {
			toast({
				variant: "destructive",
				title: "Missing payment proof URL",
				description: "Please enter a payment proof URL.",
			});
			return;
		}

		setProofSubmittingOrderId(orderId);
		try {
			await submitMerchPaymentProof(orderId, paymentProofUrl);
			toast({
				title: "Payment proof submitted",
				description: "Your order has been moved for organizer review.",
			});
			await fetchMerchOrders();
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Failed to submit payment proof",
				description: err.response?.data?.message || "Please try again.",
			});
		} finally {
			setProofSubmittingOrderId(null);
		}
	};

	const isCurrentUserMember = team?.members?.some((member) => member.userId?._id === currentUser?._id);
	const isTeamLeader = team?.leaderId?._id === currentUser?._id;
	const hasPendingInvite = team?.invites?.some((invite) => invite.email === currentUser?.email && invite.status === "pending");
	const acceptedMembers = (team?.members || []).filter((member) => member.status === "accepted");
	const isTeamCompleted = team?.status === "completed";
	const isIneligible = (
		(event?.eligibility === "iiit_only" && currentUser?.participantProfile?.participantType !== "IIIT") ||
		(event?.eligibility === "non_iiit_only" && currentUser?.participantProfile?.participantType !== "Non-IIIT")
	);

	if (loading) {
		return <div className="grid place-items-center py-10">Loading event...</div>;
	}

	if (!event) {
		return <div className="border rounded-md p-6 text-center">Event not found</div>;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>{event.name}</CardTitle>
				<CardDescription>{formatEnumLabel(event.eventType)}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2">
				<div>{event.description}</div>
				<div>Status: {event.status}</div>
				<div>Team event: {event.isTeamEvent ? "Yes" : "No"}</div>
				<div>Eligibility: {formatEnumLabel(event.eligibility)}</div>
				{isIneligible ? <div className="text-sm font-medium">You are not eligible for this event</div> : null}
				<div>Registration deadline: {event.registrationDeadline ? new Date(event.registrationDeadline).toLocaleString() : "N/A"}</div>
				<div>Start: {event.startDate ? new Date(event.startDate).toLocaleString() : "N/A"}</div>
				<div>End: {event.endDate ? new Date(event.endDate).toLocaleString() : "N/A"}</div>
				<div>Organizer: {event.organizerId?.name || "N/A"}</div>
				{event.isTeamEvent ? (
					<div>Team size: {event.minTeamSize || 2} - {event.maxTeamSize || 5}</div>
				) : null}
				{/* do a conditional render for a team event */}
			</CardContent>
			{event.isTeamEvent ? (
				<CardFooter className="w-full">
					<div className="w-full space-y-4">
						{isIneligible ? (
							<div className="border rounded-md p-3 text-sm">You are not eligible for this event</div>
						) : teamLoading ? (
							<div>Loading team details...</div>
						) : team ? (
							<div className="space-y-3 w-full">
								<div className="font-medium">Team: {team.teamName}</div>
								{isTeamLeader && team.inviteCode ? <div>Invite Code: {team.inviteCode}</div> : null}
								<div>Status: {team.status}</div>
								<div>Members: {team.members?.length || 0}/{team.teamSize}</div>
								{isTeamCompleted ? (
									<div className="border rounded-md p-2">Team registration is completed for this event.</div>
								) : null}
								<div className="space-y-1">
									<div className="font-medium">Accepted Members</div>
									{acceptedMembers.length === 0 ? (
										<div>No accepted members yet.</div>
									) : (
										acceptedMembers.map((member) => (
											<div key={member.userId?._id || member.userId}>
												{member.userId?.firstName || ""} {member.userId?.lastName || ""} ({member.userId?.email || "N/A"})
											</div>
										))
									)}
								</div>
								<div className="space-y-1">
									<div className="font-medium">Invite Tracking</div>
									{(team.invites || []).length === 0 ? (
										<div>No invite emails were added.</div>
									) : (
										(team.invites || []).map((invite) => (
											<div key={invite.email}>
												{invite.email} - {invite.status}
											</div>
										))
									)}
								</div>
								{hasPendingInvite && !isCurrentUserMember && !isTeamCompleted ? (
									<div className="space-y-2">
										<Label htmlFor="inviteCodePending">Enter Invite Code To Accept</Label>
										<Input
											id="inviteCodePending"
											value={inviteCode}
											onChange={(e) => setInviteCode(e.target.value)}
											placeholder="Enter invite code"
										/>
										<div className="flex items-center gap-2">
											<Button onClick={joinByCode} disabled={teamSubmitting || !inviteCode.trim()}>
												{teamSubmitting ? "Submitting..." : "Accept Invite"}
											</Button>
											<Button variant="outline" onClick={rejectInviteByCode} disabled={teamSubmitting}>
												{teamSubmitting ? "Submitting..." : "Reject Invite"}
											</Button>
										</div>
									</div>
								) : null}
							</div>
						) : (
							<div className="w-full space-y-4">
								{/* render form fields for team events with form schema */}
								{(event.formSchema || []).length > 0 ? (
									<div className="space-y-3">
										<div className="font-medium">Registration Form</div>
										{event.formSchema.map((field, index) => (
											<div key={`${field.label}-${index}`} className="space-y-1">
												<Label>{field.label}</Label>
												{field.fieldType === "dropdown" ? (
													<select
														value={formAnswers[field.label] || ""}
														onChange={(e) => setFormAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
														className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
													>
														<option value="">Select</option>
														{(field.options || []).map((option) => (
															<option key={option} value={option}>{option}</option>
														))}
													</select>
												) : field.fieldType === "checkbox" ? (
													<div className="space-y-1">
														{(field.options || ["Yes"]).map((option) => {
															const selectedOptions = Array.isArray(formAnswers[field.label]) ? formAnswers[field.label] : [];
															const isChecked = selectedOptions.includes(option);
															return (
																<label key={option} className="flex items-center gap-2 text-sm">
																	<input
																		type="checkbox"
																		checked={isChecked}
																		onChange={(e) => {
																			setFormAnswers((prev) => {
																				const existing = Array.isArray(prev[field.label]) ? prev[field.label] : [];
																				const next = e.target.checked
																					? [...existing, option]
																					: existing.filter((value) => value !== option);
																				return { ...prev, [field.label]: next };
																			});
																		}}
																	/>
																	{option}
																</label>
															);
														})}
													</div>
												) : (
													<Input
														type={field.fieldType === "number" ? "number" : "text"}
														value={formAnswers[field.label] || ""}
														onChange={(e) => setFormAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
														placeholder={field.fieldType === "file" ? "Paste uploaded file URL" : ""}
													/>
												)}
											</div>
										))}
									</div>
								) : null}
								<div className="space-y-2">
									<Label htmlFor="teamName">Team Name</Label>
									<Input id="teamName" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
								</div>
								<div className="space-y-2">
									<Label htmlFor="teamSize">Team Size</Label>
									<Input
										id="teamSize"
										type="number"
										min={event.minTeamSize || 2}
										max={event.maxTeamSize || 5}
										value={teamSize}
										onChange={(e) => setTeamSize(e.target.value)}
									/>
								</div>
								<div className="space-y-2">
									<Label htmlFor="inviteEmails">Invite Emails (comma separated)</Label>
									<Input
										id="inviteEmails"
										value={inviteEmails}
										onChange={(e) => setInviteEmails(e.target.value)}
										placeholder="person1@mail.com, person2@mail.com"
									/>
								</div>
								<Button onClick={createTeam} disabled={isIneligible || teamSubmitting || !teamName.trim()}>
									{teamSubmitting ? "Creating..." : "Create Team"}
								</Button>
								<div className="border-t pt-4 space-y-2">
									<Label htmlFor="inviteCode">Join With Invite Code</Label>
									<Input
										id="inviteCode"
										value={inviteCode}
										onChange={(e) => setInviteCode(e.target.value)}
										placeholder="enter invite code"
									/>
									<div className="flex items-center gap-2">
										<Button onClick={joinByCode} disabled={isIneligible || teamSubmitting || !inviteCode.trim()}>
											{teamSubmitting ? "Joining..." : "Join Team"}
										</Button>
										<Button variant="outline" onClick={rejectInviteByCode} disabled={teamSubmitting}>
											{teamSubmitting ? "Submitting..." : "Reject Invite"}
										</Button>
									</div>
								</div>
							</div>
						)}
					</div>
				</CardFooter>
			) : event.eventType === "merchandise" ? (
				<CardFooter className="w-full">
					<div className="w-full space-y-4">
						<div className="space-y-2">
							<Label htmlFor="itemName">Item</Label>
							<select
								id="itemName"
								value={merchOrderForm.itemName}
								onChange={(e) => handleMerchItemChange(e.target.value)}
								className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								{(event.merchItems || []).map((item) => (
									<option key={item.name} value={item.name}>{item.name}</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="variant">Variant</Label>
							<select
								id="variant"
								value={merchOrderForm.variant}
								onChange={(e) => setMerchOrderForm((prev) => ({ ...prev, variant: e.target.value }))}
								className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
							>
								{((event.merchItems || []).find((item) => item.name === merchOrderForm.itemName)?.variants || []).map((variant) => (
									<option key={variant} value={variant}>{variant}</option>
								))}
							</select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="quantity">Quantity</Label>
							<Input
								id="quantity"
								type="number"
								min="1"
								value={merchOrderForm.quantity}
								onChange={(e) => setMerchOrderForm((prev) => ({ ...prev, quantity: e.target.value }))}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="paymentProofUrl">Payment Proof URL (optional now, required before approval)</Label>
							<Input
								id="paymentProofUrl"
								value={merchOrderForm.paymentProofUrl}
								onChange={(e) => setMerchOrderForm((prev) => ({ ...prev, paymentProofUrl: e.target.value }))}
								placeholder="https://..."
							/>
						</div>
						<Button onClick={createMerchOrder} disabled={merchSubmitting || !merchOrderForm.itemName}>
							{merchSubmitting ? "Creating..." : "Place Order"}
						</Button>

						{/* map each merch ordrs to their id and display their information stored in the state vars */}
						<div className="space-y-2 border-t pt-4">
							<div className="font-medium">My Orders</div>
							{merchLoading ? (
								<div>Loading orders...</div>
							) : merchOrders.length === 0 ? (
								<div>No orders yet</div>
							) : (
								merchOrders.map((order) => (
									<div key={order._id} className="border rounded-md p-3 text-sm space-y-1">
										<div>Item: {order.itemName} {order.variant ? `(${order.variant})` : ""}</div>
										<div>Quantity: {order.quantity}</div>
										<div>Status: {order.status}</div>
										<div>Total: {order.totalAmount}</div>
										<div>
											Payment Proof: {order.paymentProofUrl ? <a className="underline" href={order.paymentProofUrl} target="_blank" rel="noreferrer">View</a> : "Not submitted"}
										</div>
										{order.reviewComment ? <div>Review Comment: {order.reviewComment}</div> : null}
										{order.status === "pending_proof" || order.status === "rejected" ? (
											<div className="space-y-2">
												<Input
													value={proofInputs[order._id] || ""}
													onChange={(e) => setProofInputs((prev) => ({ ...prev, [order._id]: e.target.value }))}
													placeholder="payment proof URL"
												/>
												<Button
													onClick={() => submitProofForOrder(order._id)}
													disabled={proofSubmittingOrderId === order._id}
												>
													{proofSubmittingOrderId === order._id ? "Submitting..." : "Submit Proof"}
												</Button>
											</div>
										) : null}
									</div>
								))
							)}
						</div>
					</div>
				</CardFooter>
			) : (
				<CardFooter>
					{(event.formSchema || []).length > 0 ? (
						<div className="w-full space-y-3 mb-4">
							<div className="font-medium">Registration Form</div>
							{event.formSchema.map((field, index) => (
								<div key={`${field.label}-${index}`} className="space-y-1">
									<Label>{field.label}</Label>
									{field.fieldType === "dropdown" ? (
										<select
											value={formAnswers[field.label] || ""}
											onChange={(e) => setFormAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
											className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
										>
											<option value="">Select</option>
											{(field.options || []).map((option) => (
												<option key={option} value={option}>{option}</option>
											))}
										</select>
									) : field.fieldType === "checkbox" ? (
										<div className="space-y-1">
											{(field.options || ["Yes"]).map((option) => {
												const selectedOptions = Array.isArray(formAnswers[field.label]) ? formAnswers[field.label] : [];
												const isChecked = selectedOptions.includes(option);
												return (
													<label key={option} className="flex items-center gap-2 text-sm">
														<input
															type="checkbox"
															checked={isChecked}
															onChange={(e) => {
																setFormAnswers((prev) => {
																	const existing = Array.isArray(prev[field.label]) ? prev[field.label] : [];
																	const next = e.target.checked
																		? [...existing, option]
																		: existing.filter((value) => value !== option);
																	return { ...prev, [field.label]: next };
																});
															}}
														/>
														{option}
													</label>
												);
											})}
										</div>
									) : (
										<Input
											type={field.fieldType === "number" ? "number" : "text"}
											value={formAnswers[field.label] || ""}
											onChange={(e) => setFormAnswers((prev) => ({ ...prev, [field.label]: e.target.value }))}
											placeholder={field.fieldType === "file" ? "Paste uploaded file URL" : ""}
										/>
									)}
								</div>
							))}
						</div>
					) : null}
					{isIneligible ? (
						<Button disabled variant="outline">Not eligible</Button>
					) : isAlreadyRegistered ? (
						<Button disabled variant="outline">Registered</Button>
					) : (
						<Button onClick={registerForEvent} disabled={registering}>
							{registering ? "Registering..." : "Register"}
						</Button>
					)}
				</CardFooter>
			)}
		</Card>
	);
};

export default ParticipantEventDetails;
