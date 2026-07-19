const express = require("express");
const router = express.Router();
const { sendInvite, acceptInvite } = require("../controllers/inviteController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post("/send", requireAuth, requireRole(["admin"]), sendInvite);
router.post("/accept", acceptInvite); // Public route for workers setting their passwords

module.exports = router;
