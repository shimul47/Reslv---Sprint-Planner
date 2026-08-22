import express from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  login,
  getMe,
  updateUser,
  changePassword,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/login", login);
router.get("/me", getMe);
router.patch("/user", requireAuth, updateUser);
router.patch("/password", requireAuth, changePassword);

export default router;
