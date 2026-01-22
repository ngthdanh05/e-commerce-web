import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "controllers/product.controller";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();

router.get("/", getAllProducts);
router.get("/:id", verifyToken, getProductById);

export default router;
