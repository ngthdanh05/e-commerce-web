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
import { verifyToken } from "middleware/auth";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  updateProduct,
} from "controllers/product.controller";

const router = express.Router();

router.get("/dashboard", verifyToken, getDashboardData);

router.get("/categories", verifyToken, getAllCategories);
router.post("/categories", verifyToken, createCategory);
router.put("/categories/:id", verifyToken, updateCategory);
router.delete("/categories/:id", verifyToken, deleteCategory);

router.get("/products", verifyToken, getAllProducts);
router.post("/products", verifyToken, createProduct);
router.put("/products/:id", verifyToken, updateProduct);
router.delete("/products/:id", verifyToken, deleteProduct);

router.get("/users", verifyToken, getAllUsers);
router.put("/users/:id/block", verifyToken, toggleBlockUser);
router.delete("/users/:id", verifyToken, deleteUser);

router.get("/orders", verifyToken, getOrderForAdmin);
router.put("/orders/:id", verifyToken, updateOrderForAdmin);
router.delete("/orders/:id", verifyToken, deleteOrderForAdmin);
export default router;
