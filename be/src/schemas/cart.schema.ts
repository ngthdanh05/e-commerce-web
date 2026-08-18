import { z } from "zod";
import { ObjectId } from "mongodb";

const productIdSchema = z.string().min(1, "Product ID is required");

// Schema Thêm vào Giỏ hàng (POST /api/cart)
export const addToCartSchema = z.object({
  productId: productIdSchema,
  quantity: z
    .number("Quantity is required")
    .int()
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity must not exceed 99"),
});

// Schema Cập nhật Giỏ hàng (PUT /api/cart)
export const updateCartSchema = z.object({
  productId: productIdSchema,
  quantity: z
    .number("Quantity is required")
    .int()
    .min(0, "Quantity cannot be negative")
    .max(99, "Quantity must not exceed 99"),
});

// Schema Xóa item khỏi Giỏ hàng (DELETE /api/cart)
export const deleteCartItemSchema = z.object({
  productId: productIdSchema,
});