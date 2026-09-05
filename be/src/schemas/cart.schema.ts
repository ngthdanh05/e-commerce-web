import { z } from "zod";

const productIdSchema = z.string().min(1, "Product ID is required");

export const addToCartSchema = z.object({
  productId: productIdSchema,
  quantity: z
    .number("Quantity is required")
    .int()
    .min(1, "Quantity must be at least 1")
    .max(99, "Quantity must not exceed 99"),
});

export const updateCartSchema = z.object({
  productId: productIdSchema,
  quantity: z
    .number("Quantity is required")
    .int()
    .min(0, "Quantity cannot be negative")
    .max(99, "Quantity must not exceed 99"),
});

export const deleteCartItemSchema = z.object({
  productId: productIdSchema,
});
