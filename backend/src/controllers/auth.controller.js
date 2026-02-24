// auth controllers cookie management

const authService = require("../services/auth.service");
const User = require("../models/User");

// just for debugging
const me = async (req, res) => {
	console.log("ME HIT");
	try {
		const user = await User.findById(req.user.userId).select("-passwordHash");

		if(!user) {
			return res.status(404).json({message: "User not found"});
		}
		res.status(200).json(user);
	} catch (err) {
		res.status(500).json({message: "Server Error"});
	}
}; 

const registerParticipant = async (req, res) => {
	console.log("REGISTER HIT", req.body);
	try {
		await authService.registerParticipant(req.body);
		// new resource/user handled successfully
		return res.status(201).json({message: "Registered Successfully"});
	} catch (err) {
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const login = async (req, res) => {
	try {
		// get the destructured token and role
		const {token, role} = await authService.login(req.body);
		res.cookie("token", token, authService.cookieOptions);
		return res.status(200).json({role});
	} catch (err) {
		return res.status(err.statusCode || 500).json({message: err.message});
	}
};

const logout = (req, res) => {
	res.clearCookie("token");
	res.status(200).json({message: "Logged Out"});
};

 
module.exports = {
	registerParticipant,
	login,
	logout,
	me,
};


