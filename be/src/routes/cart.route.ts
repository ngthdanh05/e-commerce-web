import {
  addToCart,
  deleteCart,
  getCart,
  updateCart,
} from "controllers/cart.controller";
import express from "express";
import { verifyToken } from "middleware/auth";
import { validate } from "middleware/validate";
import {
  addToCartSchema,
  deleteCartItemSchema,
  updateCartSchema,
} from "schemas/cart.schemat";

const router = express.Router();

router.get("/", verifyToken, getCart);
router.post(
  "/add",
  validate({ body: addToCartSchema }),
  verifyToken,
  addToCart,
);
router.put(
  "/update",
  validate({ body: updateCartSchema }),
  verifyToken,
  updateCart,
);
router.delete(
  "/delete",
  validate({ body: deleteCartItemSchema }),
  verifyToken,
  deleteCart,
);

export default router;
