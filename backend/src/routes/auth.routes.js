// Authorization routes

const express = require("express");
const router = express.Router();

console.log(">>> AUTH ROUTES FILE LOADED <<<");

// get the controllers and middlewares
const authControllers = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

 // signup route
router.post("/register/participant", authControllers.registerParticipant);
// login route
router.post("/login", authControllers.login);
// logout clearing cookies
router.post("/logout", authControllers.logout);
// debugging purposes
router.get("/me", authMiddleware, authControllers.me);

module.exports = router;
