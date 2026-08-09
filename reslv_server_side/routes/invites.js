import express from "express";
import {
  acceptInvite,
  getInviteByToken,
} from "../controllers/inviteApiController.js";

const router = express.Router();

router.get("/:token", getInviteByToken);
router.post("/accept", acceptInvite);

export default router;
