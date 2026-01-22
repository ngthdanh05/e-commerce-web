import { createCheckout, vnpayCallback } from "controllers/checkout.controller";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();

router.post("/create", verifyToken, createCheckout);

router.get("/vnpay-callback", vnpayCallback);

export default router;
