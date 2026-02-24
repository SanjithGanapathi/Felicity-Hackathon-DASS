const sendEmailNotification = async ({ to, subject, body }) => {
	// skip invalid payloads to avoid blocking business workflow
	if(!to || !subject || !body) {
		return false;
	}

	const webhookUrl = process.env.MAIL_WEBHOOK_URL;
	if(!webhookUrl) {
		// fallback to server log when no outbound provider is configured
		console.log("Simulated email notification", { to, subject, body });
		return true;
	}

	try {
		const response = await fetch(webhookUrl, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ to, subject, body }),
		});
		return response.ok;
	} catch (err) {
		console.error("Email notification error", err.message);
		return false;
	}
};

module.exports = {
	sendEmailNotification,
};
