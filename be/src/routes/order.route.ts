import {
  deleteOrder,
  getAllOrders,
  getOrderById,
} from "controllers/order.controller";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();

router.get("/", verifyToken, getAllOrders);
router.get("/:id", verifyToken, getOrderById);
router.delete("/:id", verifyToken, deleteOrder);

export default router;
