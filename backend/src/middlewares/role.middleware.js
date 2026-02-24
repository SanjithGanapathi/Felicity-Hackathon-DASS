// RBAC implementation

const requireRole = (allowedRoles) => {
	return (req, res, next) => {

		//debug print
		console.log("User Role:", req.user?.role, "| Allowed:", allowedRoles);

		// we have to ensure authentication done
		if(!req.user || !req.user.role) {
			return res.status(401).json({ message : "Unauthorized: Role not found"});
		}

		// check if current role in in allowed roles
		if(!allowedRoles.includes(req.user.role)) {
			return res.status(403).json({ message : "Forbidden: Role not found"});
		}
		next();
	};		
};

module.exports = requireRole;
