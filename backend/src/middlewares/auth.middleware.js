// middleware for the auth 

const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
	// ?. chaining prevents crashes if the token isn't defined
	const token = req.cookies?.token;

	// if user not authenticated or cookie expired
	if(!token) {
		return res.status(401).json({message: "Authentication Required"});
	}

	
	try {
		const decodedData = jwt.verify(token, process.env.JWT_SECRET);
		
		req.user = {
			userId: decodedData.userId,
			role: decodedData.role,
		};
		// move to the next handler
		next();
	} catch (err) {
		console.error("Auth Middleware Error:", err.message);
		return res.status(401).json({message: "Invalid or Expired cookie"});
	}
};

module.exports = authMiddleware;



