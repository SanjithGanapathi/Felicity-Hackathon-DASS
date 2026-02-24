// Admin backend login

const bcrypt = require("bcrypt");
const User = require("../models/User");

const seedAdmin = async () => {
	try {
		// check if admin already exists
		const adminExists = await User.findOne({role: "admin"});
		if(adminExists) {
			console.log("Admin account already exists");
			return;
		}
	
		// validate env var
		const email = process.env.ADMIN_EMAIL;
		const password = process.env.ADMIN_PASSWORD;
	
		if(!email || !password) {
			console.error("ADMIN_EMAIL ADMIN_PASSWORD missing in .env");
			return;
		}

		const passwordHash = await bcrypt.hash(password, 10);
	
		await User.create({
			firstName: "System",
			lastName: "Admin",
			email: email.toLowerCase(),
			passwordHash: passwordHash,
			role: "admin",
		});
	} catch (err) {
		console.error("Failed to create Admin: ", err.message);
	}
};
	
module.exports = seedAdmin;	
