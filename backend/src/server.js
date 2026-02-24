// Entry point to the backend 

// Get all env vars and validate them
require("dotenv").config();
const validateEnv = require("./config/env");
validateEnv();

const app = require("./app");
const connectDB = require("./config/db");
const seedAdmin = require("./config/seedAdmin");
 
const startServer = async () => {
	try {
		await connectDB();
		await seedAdmin();
		app.listen(process.env.PORT, () => {
			console.log(`Server running at ${process.env.PORT}`);
		});	
 	} catch (err) {
		console.error(err);
		process.exit(1);
	};
};

startServer();
