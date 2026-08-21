import { z } from "zod";

const mongoObjectIdSchema = z
  .string({ error: "INVALID_ORDER_ID" })
  .regex(/^[0-9a-fA-F]{24}$/, "INVALID_ORDER_ID");

export const orderStatusSchema = z.object({
  status: z.enum(
    ["pending", "processing", "shipping", "success", "failed", "cancelled"],
    { error: "INVALID_ORDER_STATUS" },
  ),
});

export const orderIdParamSchema = z.object({
  id: mongoObjectIdSchema,
});

export const orderIdSchema = z.object({
  orderId: mongoObjectIdSchema,
});

export type OrderStatusInput = z.infer<typeof orderStatusSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
export type OrderIdInput = z.infer<typeof orderIdSchema>;
