import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "controllers/product.controller";
import express from "express";
import { verifyToken } from "middleware/auth";
import { validate } from "middleware/validate";
import {
  productIdParamSchema,
  productQuerySchema,
} from "schemas/product.schema";

const router = express.Router();

router.get("/", validate({ query: productQuerySchema }), getAllProducts);
router.get(
  "/:id",
  validate({ params: productIdParamSchema }),
  verifyToken,
  getProductById,
);

export default router;
