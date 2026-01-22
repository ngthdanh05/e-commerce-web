import {
  addToCart,
  deleteCart,
  getCart,
  updateCart,
} from "controllers/cart.controller";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();

router.get("/", verifyToken, getCart);
router.post("/add", verifyToken, addToCart);
router.put("/update", verifyToken, updateCart);
router.delete("/delete", verifyToken, deleteCart);

export default router;
