import { profile } from "controllers/user.controller";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();
router.get("/profile", verifyToken, profile);

export default router;
