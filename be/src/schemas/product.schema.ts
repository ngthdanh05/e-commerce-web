import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdSchema = z.string().refine((val) => ObjectId.isValid(val), {
  message: "INVALID_PRODUCT_ID",
});

// Schema Tạo mới Sản phẩm (POST /api/products)
export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  price: z.coerce
    .number({ message: "Price must be a number" })
    .int("Price must be an integer")
    .min(1000, "Price must be at least 1,000 VND")
    .max(1000000000, "Price must be at most 1,000,000,000 VND"),

  description: z.string().min(1, "Description is required").trim(),
  category: z.string().trim().optional().default("uncategorized"),
  imageUrl: z.string().trim().optional().default(""),
  public_id: z.string().optional().default(""),
});

// Schema Cập nhật Sản phẩm (PUT /api/products/:id)
export const updateProductSchema = createProductSchema.partial();

// Schema Validate ID trên Params (GET/DELETE /api/products/:id)
export const productIdParamSchema = z.object({
  id: objectIdSchema,
});

// Schema Query Phân trang (GET /api/products)
export const productQuerySchema = z.object({
  page: z.preprocess((val) => {
    if (val === undefined || val === null) return 1;
    const parsed = Number(val);
    return isNaN(parsed) || parsed < 1 ? 1 : parsed;
  }, z.number().int().min(1).max(1000).optional().default(1)),
  limit: z.preprocess((val) => {
    if (val === undefined || val === null) return 10;
    const parsed = Number(val);
    if (isNaN(parsed) || parsed < 1) return 10;
    return parsed > 100 ? 100 : parsed;
  }, z.number().int().min(1).max(100).optional().default(10)),
});
