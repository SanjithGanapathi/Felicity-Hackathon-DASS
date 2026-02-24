 import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logoutSession } from "@/lib/session";

const ParticipantNavbar = () => {
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
			<Link to="/participant/dashboard">Felicity</Link>
			<div className="flex items-center gap-4">
				<Link to="/participant/dashboard">Dashboard</Link>
				<Link to="/participant/events">Browse Events</Link>
				<Link to="/participant/organizers">Clubs/Organizers</Link>
				<Link to="/participant/profile">Profile</Link>
				<Button variant="outline" onClick={handleLogout}>
					Logout
				</Button>
			</div>
		</nav>
	);
};

export default ParticipantNavbar;
