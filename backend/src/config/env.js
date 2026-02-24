// figure validation properly

function validateEnv() {
	if(!process.env.MONGO_URI) {
		throw new Error("MONGO_URI is missing");
	}

	if(!process.env.JWT_SECRET) {
		throw new Error("JWT_SECRET is missing");
	}

	if(!process.env.PORT) {
		throw new Error("PORT is missing");
	}

	if(!process.env.MONGO_DBUSER_PASSWORD) {
		throw new Error("MONGO_DBUSER_PASSWORD is missing");
	}
};

module.exports = validateEnv; 
