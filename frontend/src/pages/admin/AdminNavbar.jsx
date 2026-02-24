import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { logoutSession } from "@/lib/session";

const AdminNavbar = () => {
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
			<Link to="/admin/dashboard">Felicity</Link>
			<div className="flex items-center gap-4">
				<Link to="/admin/dashboard">Dashboard</Link>
				<Link to="/admin/organizers">Manage Organizers</Link>
				<Link to="/admin/password-reset-requests">Password Reset Requests</Link>
				<Button variant="outline" onClick={handleLogout}>
					Logout
				</Button>
			</div>
		</nav>
	);
};

export default AdminNavbar;
