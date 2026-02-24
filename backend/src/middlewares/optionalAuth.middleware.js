const jwt = require("jsonwebtoken");

const optionalAuthMiddleware = (req, res, next) => {
	const token = req.cookies?.token;

	if(!token) {
		return next();
	}

	try {
		const decodedData = jwt.verify(token, process.env.JWT_SECRET);
		req.user = {
			userId: decodedData.userId,
			role: decodedData.role,
		};
	} catch (err) {
	}

	return next();
};

module.exports = optionalAuthMiddleware;
