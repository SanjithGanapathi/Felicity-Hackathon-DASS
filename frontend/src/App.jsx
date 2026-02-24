import { useEffect, useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import Login from "./pages/Login";
import { Toaster } from "@/components/ui/toaster";
import Register from "./pages/Register";
import Dashboard from "./pages/participant/Dashboard";
import ParticipantEvents from "./pages/participant/ParticipantEvents";
import ParticipantEventDetails from "./pages/participant/ParticipantEventDetails";
import ParticipantOrganizers from "./pages/participant/ParticipantOrganizers";
import ParticipantOrganizerDetail from "./pages/participant/ParticipantOrganizerDetail";
import ParticipantProfile from "./pages/participant/ParticipantProfile";
import ParticipantOnboarding from "./pages/participant/Onboarding";
import ParticipantNavbar from "./pages/participant/ParticipantNavbar";
import OrganizerDashboard from "./pages/organizer/OrganizerDashboard";
import OrganizerCreateEvent from "./pages/organizer/OrganizerCreateEvent";
import OrganizerPasswordReset from "./pages/organizer/OrganizerPasswordReset";
import OrganizerEventDetail from "./pages/organizer/OrganizerEventDetail";
import OrganizerProfile from "./pages/organizer/OrganizerProfile";
import OrganizerOngoingEvents from "./pages/organizer/OrganizerOngoingEvents";
import OrganizerNavbar from "./pages/organizer/OrganizerNavbar";
import AdminNavbar from "./pages/admin/AdminNavbar";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrganizers from "./pages/admin/AdminOrganizers";
import AdminPasswordResetRequests from "./pages/admin/AdminPasswordResetRequests";
import api from "@/lib/api";


const RequireAuth = ({ allowedRoles }) => {
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState(null);

	useEffect(() => {
		const loadMe = async () => {
			try {
				const response = await api.get("/auth/me");
				setUser(response.data);
			} catch (err) {
				setUser(null);
			} finally {
				setLoading(false);
			}
		};

		loadMe();
	}, []);

	if(loading) {
		return <div className="min-h-screen grid place-items-center">Loading...</div>;
	}

	if(!user) {
		return <Navigate to="/login" replace />;
	}

	if(allowedRoles && !allowedRoles.includes(user.role)) {
		return <Navigate to={`/${user.role}/dashboard`} replace />;
	}

	return <Outlet />;
};

// method to set the app layout with participant navbar on the top and then the page content (<Outlet />) gets rendered
const ParticipantLayout = () => {
	return (
		<div className="min-h-screen">
			<ParticipantNavbar />
			<main className="max-w-5xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
};

// method to set the app layout with organizer navbar on the top and then the page content (<Outlet />) gets rendered
const OrganizerLayout = () => {
	return (
		<div className="min-h-screen">
			<OrganizerNavbar />
			<main className="max-w-5xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
};

// method to set the app layout with admin navbar on the top and then the page content (<Outlet />) gets rendered
const AdminLayout = () => {
	return (
		<div className="min-h-screen">
			<AdminNavbar />
			<main className="max-w-5xl mx-auto p-4">
				<Outlet />
			</main>
		</div>
	);
};

function App() {
  return (
	<>
		<Routes>
			<Route path="/login" element={<Login />} />
			<Route path="/participant/register" element={<Register />} />
			<Route path="/" element={<Navigate to="/participant/dashboard" replace />} />

			<Route element={<RequireAuth allowedRoles={["participant"]} />}>
				{/* wrap all these pages with the app layout */}
				<Route element={<ParticipantLayout />}>
					<Route path="/participant/dashboard" element={<Dashboard />} />
					<Route path="/participant/events" element={<ParticipantEvents />} />
					<Route path="/participant/events/:id" element={<ParticipantEventDetails />} />
					<Route path="/participant/organizers" element={<ParticipantOrganizers />} />
					<Route path="/participant/organizers/:organizerId" element={<ParticipantOrganizerDetail />} />
					<Route path="/participant/profile" element={<ParticipantProfile />} />
					<Route path="/participant/onboarding" element={<ParticipantOnboarding />} />
				</Route>
			</Route>

			<Route element={<RequireAuth allowedRoles={["organizer"]} />}>
				{/* wrap all these pages with the app layout */}
				<Route element={<OrganizerLayout />}>
					<Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
					<Route path="/organizer/events/new" element={<OrganizerCreateEvent />} />
					<Route path="/organizer/events/:id" element={<OrganizerEventDetail />} />
					<Route path="/organizer/events/ongoing" element={<OrganizerOngoingEvents />} />
					<Route path="/organizer/profile" element={<OrganizerProfile />} />
					<Route path="/organizer/password-reset" element={<OrganizerPasswordReset />} />
				</Route>
			</Route>
			<Route element={<RequireAuth allowedRoles={["admin"]} />}>
				{/* wrap all these pages with the app layout */}
				<Route element={<AdminLayout />}>
					<Route path="/admin/dashboard" element={<AdminDashboard />} />
					<Route path="/admin/organizers" element={<AdminOrganizers />} />
					<Route path="/admin/password-reset-requests" element={<AdminPasswordResetRequests />} />
				</Route>
			</Route>

		</Routes>
	
		{/* to send alerts */}
		<Toaster />
	</>
  );
}

export default App;
