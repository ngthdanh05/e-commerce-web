import {
  deleteOrder,
  getAllOrders,
  getOrderById,
  getOrderForAdmin,
  updateOrderForAdmin,
} from "controllers/order.controller";
import express from "express";
import { verifyToken, isAdmin } from "middleware/auth";

const router = express.Router();

router.get("/", verifyToken, getAllOrders);
router.get("/:id", verifyToken, getOrderById);
router.delete("/:id", verifyToken, deleteOrder);

export default router;
