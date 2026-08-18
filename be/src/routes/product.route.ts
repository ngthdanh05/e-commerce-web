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
  createProductSchema,
  updateProductSchema,
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

router.post(
  "/",
  verifyToken,
  validate({ body: createProductSchema }),
  createProduct,
);

router.put(
  "/:id",
  verifyToken,
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  updateProduct,
);

router.delete(
  "/:id",
  verifyToken,
  validate({ params: productIdParamSchema }),
  deleteProduct,
);

export default router;
