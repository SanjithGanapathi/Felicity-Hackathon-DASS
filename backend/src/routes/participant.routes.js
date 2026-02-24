// participant stuff

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/auth.middleware");
const requireRole = require("../middlewares/role.middleware");
const participantControllers = require("../controllers/participant.controller");

router.use(authMiddleware, requireRole(["participant"]));

// get profile
router.get("/me", participantControllers.getProfile);
// update profile
router.put("/me", participantControllers.updateProfile);
// update participant password
router.put("/me/password", participantControllers.updatePassword);


// get registrations
router.get("/my-registrations", participantControllers.getMyRegistrations);

// get organizers based on preferences
router.get("/organizers", participantControllers.getOrganizers);
// get organizer detail with upcoming and past events
router.get("/organizers/:organizerId", participantControllers.getOrganizerDetail);

// follow an organizer
router.post("/following/:organizerId", participantControllers.followOrganizer);
// support follow via get for current frontend flow
router.get("/following/:organizerId", participantControllers.followOrganizer);
// unfollow an organizer
router.delete("/following/:organizerId", participantControllers.unfollowOrganizer);

// create merchandise order
router.post("/merch-orders", participantControllers.createMerchOrder);
// submit or resubmit payment proof for order
router.patch("/merch-orders/:orderId/proof", participantControllers.submitMerchPaymentProof);
// fetch participant merchandise orders
router.get("/merch-orders", participantControllers.getMyMerchOrders);

module.exports = router;
