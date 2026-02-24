import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logoutSession } from "@/lib/session";

const OrganizerNavbar = () => {
	const navigate = useNavigate();
	const { toast } = useToast();

	const handleLogout = async () => {
		try {
			await logoutSession();
			navigate("/login");
		} catch (err) {
			toast({
				variant: "destructive",
				title: "Logout failed",
				description: err.response?.data?.message || "Please try again.",
			});
		}
	};

	return (
		<nav className="max-w-5xl mx-auto p-4 flex items-center justify-between gap-4">
			<Link to="/organizer/dashboard">Felicity</Link>
			<div className="flex items-center gap-4">
				<Link to="/organizer/dashboard">Dashboard</Link>
				<Link to="/organizer/events/new">Create Event</Link>
				<Link to="/organizer/events/ongoing">Ongoing Events</Link>
				<Link to="/organizer/profile">Profile</Link>
				<Link to="/organizer/password-reset">Password Reset</Link>
				<Button variant="outline" onClick={handleLogout}>
					Logout
				</Button>
			</div>
		</nav>
	);
};

export default OrganizerNavbar;
