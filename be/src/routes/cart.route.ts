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
} from "schemas/cart.schema";

const router = express.Router();

router.get("/", verifyToken, getCart);
router.post(
  "/add",
  verifyToken,
  validate({ body: addToCartSchema }),
  addToCart,
);
router.put(
  "/update",
  verifyToken,
  validate({ body: updateCartSchema }),
  updateCart,
);
router.delete(
  "/delete",
  verifyToken,
  validate({ body: deleteCartItemSchema }),
  deleteCart,
);

export default router;
