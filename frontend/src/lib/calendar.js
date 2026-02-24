const formatUtcForCalendar = (dateInput) => {
	const date = new Date(dateInput);
	if(Number.isNaN(date.getTime())) {
		return "";
	}

	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	const hours = String(date.getUTCHours()).padStart(2, "0");
	const minutes = String(date.getUTCMinutes()).padStart(2, "0");
	const seconds = String(date.getUTCSeconds()).padStart(2, "0");
	return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

const sanitizeText = (value) => {
	if(!value) return "";
	return String(value).replace(/\r?\n/g, "\\n").trim();
};

const getEventDateRange = (event) => {
	const start = event?.startDate ? new Date(event.startDate) : null;
	const end = event?.endDate ? new Date(event.endDate) : null;
	if(!start || Number.isNaN(start.getTime())) {
		return null;
	}

	if(end && !Number.isNaN(end.getTime()) && end > start) {
		return { start, end };
	}

	// fallback to 1 hour event if end date is missing/invalid
	return { start, end: new Date(start.getTime() + 60 * 60 * 1000) };
};

const buildIcsContent = (event) => {
	const range = getEventDateRange(event);
	if(!range) {
		throw new Error("Event start date is required for calendar export");
	}

	const uid = `${event?._id || Date.now()}@felicity`;
	const dtStamp = formatUtcForCalendar(new Date());
	const dtStart = formatUtcForCalendar(range.start);
	const dtEnd = formatUtcForCalendar(range.end);
	const summary = sanitizeText(event?.name || "Felicity Event");
	const description = sanitizeText(event?.description || "");
	const location = sanitizeText(event?.venue || "");

	return [
		"BEGIN:VCALENDAR",
		"VERSION:2.0",
		"PRODID:-//Felicity//Event Management//EN",
		"CALSCALE:GREGORIAN",
		"BEGIN:VEVENT",
		`UID:${uid}`,
		`DTSTAMP:${dtStamp}`,
		`DTSTART:${dtStart}`,
		`DTEND:${dtEnd}`,
		`SUMMARY:${summary}`,
		`DESCRIPTION:${description}`,
		`LOCATION:${location}`,
		"END:VEVENT",
		"END:VCALENDAR",
	].join("\r\n");
};

const downloadIcsForEvent = (event) => {
	const content = buildIcsContent(event);
	const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = `${sanitizeText(event?.name || "event").replace(/\s+/g, "-").toLowerCase()}.ics`;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
};

const buildGoogleCalendarUrl = (event) => {
	const range = getEventDateRange(event);
	if(!range) {
		throw new Error("Event start date is required for calendar export");
	}

	const params = new URLSearchParams({
		action: "TEMPLATE",
		text: event?.name || "Felicity Event",
		dates: `${formatUtcForCalendar(range.start)}/${formatUtcForCalendar(range.end)}`,
		details: event?.description || "",
		location: event?.venue || "",
	});
	return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const buildOutlookCalendarUrl = (event) => {
	const range = getEventDateRange(event);
	if(!range) {
		throw new Error("Event start date is required for calendar export");
	}

	const params = new URLSearchParams({
		path: "/calendar/action/compose",
		rru: "addevent",
		subject: event?.name || "Felicity Event",
		startdt: range.start.toISOString(),
		enddt: range.end.toISOString(),
		body: event?.description || "",
		location: event?.venue || "",
	});
	return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

export {
	buildGoogleCalendarUrl,
	buildOutlookCalendarUrl,
	downloadIcsForEvent,
};
