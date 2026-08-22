import express from "express";
import { requireCustomerAuth } from "../middleware/customerAuth.js";
import {
  handleGetCompanyInfo,
  handleSignup,
  handleLogin,
  handleGetTickets,
  handleGetSingleTicket,
  handleCreateTicket,
  handleSendMessage,
} from "../controllers/publicSupportController.js";

const router = express.Router();

router.get("/:companyCode/info", handleGetCompanyInfo);

router.post("/:companyCode/signup", handleSignup);
router.post("/signup", handleSignup);
router.post("/:companyCode/login", handleLogin);
router.post("/login", handleLogin);

router.get("/:companyCode/tickets", requireCustomerAuth, handleGetTickets);
router.get("/tickets", requireCustomerAuth, handleGetTickets);

router.get(
  "/:companyCode/tickets/:ticketId",
  requireCustomerAuth,
  handleGetSingleTicket,
);
router.get("/tickets/:ticketId", requireCustomerAuth, handleGetSingleTicket);

router.post("/:companyCode/tickets", requireCustomerAuth, handleCreateTicket);
router.post("/tickets", requireCustomerAuth, handleCreateTicket);

router.post(
  "/:companyCode/tickets/:ticketId/messages",
  requireCustomerAuth,
  handleSendMessage,
);
router.post(
  "/tickets/:ticketId/messages",
  requireCustomerAuth,
  handleSendMessage,
);

export default router;
