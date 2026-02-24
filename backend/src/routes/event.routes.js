// events stuff

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const optionalAuthMiddleware = require("../middlewares/optionalAuth.middleware");
const eventControllers = require("../controllers/event.controllers");
const organizerControllers = require("../controllers/organizer.controller");
const requireRole = require("../middlewares/role.middleware");

// get all events
router.get("/", optionalAuthMiddleware, eventControllers.getAllEvents);
// get top trending events in last 24h
router.get("/trending", eventControllers.getTrendingEvents);
// get event by id
router.get("/:id", eventControllers.getEventById);

// create event
router.post("/", authMiddleware, requireRole(['organizer']), organizerControllers.createEvent);
router.delete("/:id", authMiddleware, requireRole(['organizer']), organizerControllers.deleteEvent);

// register for an event
router.post("/:id/register", authMiddleware, requireRole(["participant"]), eventControllers.registerUserForEvent);

// create team for hackathon event
router.post("/:id/team/register", authMiddleware, requireRole(["participant"]), eventControllers.createHackathonTeam);
// fetch current participant team/invite state for hackathon event
router.get("/:id/team/my", authMiddleware, requireRole(["participant"]), eventControllers.getMyHackathonTeam);
// join team using invite code
router.post("/:id/team/join-by-code", authMiddleware, requireRole(["participant"]), eventControllers.joinHackathonTeamByCode);
// reject invite using invite code
router.post("/:id/team/reject-by-code", authMiddleware, requireRole(["participant"]), eventControllers.rejectHackathonInviteByCode);

module.exports = router;
