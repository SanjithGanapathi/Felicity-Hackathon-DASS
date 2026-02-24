// Bootstrapping 
 
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require("cors")

// First import route methods using require
const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const eventRoutes = require("./routes/event.routes");
const participantRoutes = require("./routes/participant.routes");
const organizerRoutes = require("./routes/organizer.routes");

const app = express();

app.use(express.json());
app.use(cookieParser());
// allow configured frontend urls to access backend in dev and production
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
	.split(",")
	.map((origin) => origin.trim())
	.filter(Boolean);
app.use(cors({
	origin: (origin, callback) => {
		// allow server-to-server and tools without browser origin
		if(!origin) {
			return callback(null, true);
		}
		if(allowedOrigins.includes(origin)) {
			return callback(null, true);
		}
		return callback(new Error("Not allowed by CORS"));
	},
	credentials: true,
}));

// Allow it to use routes
app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/events", eventRoutes);
app.use("/participant", participantRoutes);
app.use("/organizer", organizerRoutes);

module.exports = app
