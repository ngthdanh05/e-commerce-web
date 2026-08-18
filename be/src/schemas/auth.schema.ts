import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must not exceed 50 characters"),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "EMAIL_REQUIRED")
    .min(5, "Email must be at least 5 characters")
    .max(254, "EMAIL_TOO_LONG")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, "Invalid email format"),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(
      /[^A-Za-z0-9]/,
      "Password must contain at least one special character",
    ),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "EMAIL_REQUIRED")
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"),

  password: z.string().min(1, "Password is required"),
});

export const toggleBlockSchema = z.object({
  block: z.boolean(),
});
