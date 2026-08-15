import { z } from "zod";
import { ObjectId } from "mongodb";

const objectIdSchema = z.string().refine((val) => ObjectId.isValid(val), {
  message: "Invalid MongoDB ObjectId format",
});

// Schema Tạo mới Sản phẩm (POST /api/products)
export const createProductSchema = z.object({
  name: z.string().min(1, "Name is required").trim(),
  price: z.number().positive("Price must be greater than 0"),
  description: z.string().min(1, "Description is required").trim(),
  category: z.string().min(1, "Category is required").trim(),
  imageUrl: z.string().min(1, "Image URL is required").trim(),
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
  page: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().positive().optional().default(1),
  ),
  limit: z.preprocess(
    (val) => (val ? Number(val) : undefined),
    z.number().int().positive().optional().default(10),
  ),
});
