// admin stuff

const express = require("express");
const router = express.Router();

const adminControllers = require("../controllers/admin.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.use(authMiddleware, requireRole(["admin"]));

// create a new organizer
router.post("/organizer", adminControllers.createOrganizer);
// get all the organizers created
router.get("/organizer", adminControllers.getAllOrganizer);
// delete an organizer with his id
router.delete("/organizer/:id", adminControllers.removeOrganizer);
// update organizer status (active/disabled/archived)
router.patch("/organizer/:id/status", adminControllers.updateOrganizerStatus);

// get the dashboard details to be displayed in frontend
router.get("/dashboard", adminControllers.getDashboardSummary);

// get all the password requests sent by organizers
router.get("/password-reset-requests", adminControllers.getPasswordResetRequests);
// review and approve/reject password reset requests
router.patch("/password-reset-requests/:id", adminControllers.reviewPasswordResetRequest);

module.exports = router;
