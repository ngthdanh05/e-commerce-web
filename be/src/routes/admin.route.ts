import {
  createCategory,
  updateCategory,
  deleteCategory,
  getAllCategories,
} from "controllers/category.controller";
import {
  deleteUser,
  getAllUsers,
  toggleBlockUser,
} from "controllers/user.controller";
import express from "express";
import {
  deleteOrderForAdmin,
  getOrderForAdmin,
  updateOrderForAdmin,
} from "controllers/order.controller";
import { getDashboardData } from "controllers/dashboard.controller";
import { isAdmin, verifyToken } from "middleware/auth";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "controllers/product.controller";
import { validate } from "middleware/validate";
import { toggleBlockSchema } from "schemas/auth.schema";
import {
  createProductSchema,
  productIdParamSchema,
  productQuerySchema,
  updateProductSchema,
} from "schemas/product.schema";

const router = express.Router();

router.get("/dashboard", verifyToken, getDashboardData);

router.get("/categories", verifyToken, getAllCategories);
router.post("/categories", verifyToken, createCategory);
router.put("/categories/:id", verifyToken, updateCategory);
router.delete("/categories/:id", verifyToken, deleteCategory);

router.get(
  "/products",
  validate({ query: productQuerySchema }),
  verifyToken,
  getAllProducts,
);
router.post(
  "/products",
  validate({ body: createProductSchema }),
  verifyToken,
  createProduct,
);
router.put(
  "/products/:id",
  validate({ params: productIdParamSchema, body: updateProductSchema }),
  verifyToken,
  updateProduct,
);
router.delete("/products/:id", verifyToken, deleteProduct);

router.get("/users", verifyToken, getAllUsers);
router.put(
  "/users/:id/block",
  validate({ body: toggleBlockSchema }),
  verifyToken,
  toggleBlockUser,
);
router.delete("/users/:id", verifyToken, deleteUser);

router.get("/orders", verifyToken, isAdmin, getOrderForAdmin);
router.put("/orders/:id", verifyToken, isAdmin, updateOrderForAdmin);
router.delete("/orders/:id", verifyToken, isAdmin, deleteOrderForAdmin);
export default router;
