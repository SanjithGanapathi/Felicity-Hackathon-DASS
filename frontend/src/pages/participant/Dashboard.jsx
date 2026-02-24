import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { buildGoogleCalendarUrl, buildOutlookCalendarUrl, downloadIcsForEvent } from "@/lib/calendar";
import { fetchDashboardData } from "@/features/participant/services/participantDashboard.service";

const Dashboard = () => {
	const [data, setData] = useState({ upcoming: [], normal: [], merchandise: [], completed: [], cancelled: [] });
	const [loading, setLoading] = useState(true);
	const { toast } = useToast();

	useEffect(() => {
		const fetchData = async () => {
    		try {
	    		const dashboardData = await fetchDashboardData();
	    		setData(dashboardData);
    		} catch (err) {
    		    console.error("Failed to load dashboard:", err);
		    } finally {
		    	setLoading(false);
      		}
    	};

    	fetchData();
	}, []);

	if(loading) return <div className="grid place-items-center py-10">Loading dashboard...</div>;

	return (
    	<div className="space-y-6">
      	<header>
        	<h1 className="text-3xl font-bold tracking-tight">My Dashboard</h1>
        	<p className="text-muted-foreground">Manage your event registrations and purchases.</p>
      	</header>

      	<div className="space-y-2">
      		<h2 className="text-xl font-semibold">Upcoming Events</h2>
      		{data.upcoming.length === 0 ? (
      			<div className="text-center py-6 border rounded-md">No upcoming events.</div>
      		) : (
      			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      				{data.upcoming.map((reg) => (
      					<EventCard key={reg._id} reg={reg} toast={toast} />
      				))}
      			</div>
      		)}
      	</div>

      	<Tabs defaultValue="normal">
        	<TabsList className="mb-4">
        		<TabsTrigger value="normal">Normal ({data.normal.length})</TabsTrigger>
          		<TabsTrigger value="merchandise">Merchandise ({data.merchandise.length})</TabsTrigger>
          		<TabsTrigger value="completed">Completed ({data.completed.length})</TabsTrigger>
          		<TabsTrigger value="cancelled">Rejected/Cancelled ({data.cancelled.length})</TabsTrigger>
        	</TabsList>

        	<EventList value="normal" events={data.normal} emptyMsg="No normal event records." toast={toast} />
        	<EventList value="merchandise" events={data.merchandise} emptyMsg="No merchandise purchased." toast={toast} />
        	<EventList value="completed" events={data.completed} emptyMsg="No completed events." toast={toast} />
        	<EventList value="cancelled" events={data.cancelled} emptyMsg="No rejected/cancelled records." toast={toast} />
    	</Tabs>
    	</div>
	);
};

const EventList = ({ value, events, emptyMsg, toast }) => (
  <TabsContent value={value}>
    {events.length === 0 ? (
      <div className="text-center py-10 border rounded-md">
        {emptyMsg}
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((reg) => (
          <EventCard key={reg._id} reg={reg} toast={toast} />
        ))}
      </div>
    )}
  </TabsContent>
);

const EventCard = ({ reg, toast }) => {
  const event = reg.eventId;
  if (!event) return null;
  const hasTeam = Boolean(reg.teamName);

  const handleCalendarAction = (fn) => {
    try {
      fn();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Calendar export failed",
        description: err.message || "Event date is required to export calendar entry.",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Badge variant="secondary">
            {event.status}
          </Badge>
          <span className="text-xs">
            {event.startDate ? new Date(event.startDate).toLocaleDateString() : "TBD"}
          </span>
        </div>
        <CardTitle className="mt-2 text-lg">{event.name}</CardTitle>
        <CardDescription>{event.venue || "TBD"}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm">
          Type: {event.eventType}
        </p>
        <p className="text-sm">
          Organizer: {event.organizerId?.name || "N/A"}
        </p>
        <p className="text-sm">
          Participation Status: {reg.status}
        </p>
        <p className="text-sm">
          Registered on: {new Date(reg.createdAt).toLocaleDateString()}
        </p>
        <p className="text-sm">
          Ticket ID: {reg.ticketId && reg.qrCodeUrl ? (
            <a href={reg.qrCodeUrl} target="_blank" rel="noreferrer" className="underline">
              {reg.ticketId}
            </a>
          ) : (reg.ticketId || reg._id)}
        </p>
        {hasTeam ? (
          <p className="text-sm">
            Team: {reg.teamName} ({1 + (reg.teamMembers?.length || 0)} members)
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handleCalendarAction(() => downloadIcsForEvent(event))}>
            Download .ics
          </Button>
          <Button variant="outline" onClick={() => handleCalendarAction(() => window.open(buildGoogleCalendarUrl(event), "_blank"))}>
            Google Calendar
          </Button>
          <Button variant="outline" onClick={() => handleCalendarAction(() => window.open(buildOutlookCalendarUrl(event), "_blank"))}>
            Outlook
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Dashboard;
