const express = require("express");
const router = express.Router();
const { createTenant } = require("../controllers/adminController");
const { requireAuth, requireRole } = require("../middleware/auth");

router.post(
  "/create-tenant",
  requireAuth,
  requireRole(["superadmin"]),
  createTenant,
);

module.exports = router;
