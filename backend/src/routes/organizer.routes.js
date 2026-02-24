// organiser stuff

const express = require("express");
const router = express.Router();

const organizerControllers = require("../controllers/organizer.controller");
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");

router.use(authMiddleware, requireRole(["organizer"]));

// get organizer profile
router.get("/me", organizerControllers.getMyProfile);
// update organizer profile
router.patch("/me", organizerControllers.updateMyProfile);

// get organizer events
router.get("/events", organizerControllers.getMyEvents);
// get ongoing organizer events
router.get("/events/ongoing", organizerControllers.getOngoingEvents);
// get organizer analytics summary across events
router.get("/analytics/summary", organizerControllers.getOrganizerAnalyticsSummary);
// update organizer event with lifecycle edit rules
router.patch("/events/:id", organizerControllers.updateEvent);
// get event-level analytics for organizer event detail view
router.get("/events/:id/analytics", organizerControllers.getEventAnalytics);
// get participants list with search/status filters
router.get("/events/:id/participants", organizerControllers.getEventParticipants);
// export participants as csv
router.get("/events/:id/participants/export", organizerControllers.exportEventParticipantsCsv);
// get team tracking list for team events
router.get("/events/:id/teams", organizerControllers.getEventTeams);
// get merchandise orders for organizer event
router.get("/events/:id/merch-orders", organizerControllers.getEventMerchOrders);
// approve/reject merchandise order
router.patch("/events/:id/merch-orders/:orderId/review", organizerControllers.reviewMerchOrder);

// organizer creates password reset request
router.post("/password-reset-requests", organizerControllers.requestPasswordReset);
// organizer fetches own password reset history
router.get("/password-reset-requests", organizerControllers.getMyPasswordResetRequests);

module.exports = router;
