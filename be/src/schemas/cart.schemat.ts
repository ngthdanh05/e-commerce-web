import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdSchema = z.string().refine((val) => ObjectId.isValid(val), {
  message: "Invalid MongoDB ObjectId format",
});

// Schema Thêm vào Giỏ hàng (POST /api/cart)
export const addToCartSchema = z.object({
  productId: objectIdSchema,
  quantity: z
    .number("Quantity is required")
    .int("Quantity must be an integer")
    .min(1, "Quantity must be greater than zero")
    .max(99, "Quantity must not exceed 99"),
});

// Schema Cập nhật Giỏ hàng (PUT /api/cart)
export const updateCartSchema = z.object({
  productId: objectIdSchema,
  quantity: z
    .number("Quantity is required")
    .int("Quantity must be an integer")
    .min(0, "Quantity cannot be negative")
    .max(99, "Quantity must not exceed 99"),
});

// Schema Xóa item khỏi Giỏ hàng (DELETE /api/cart)
export const deleteCartItemSchema = z.object({
  productId: objectIdSchema,
});
