import { z } from "zod";

const vietnamesePhoneNumberSchema = z
  .string({ error: "INVALID_PHONE_NUMBER" })
  .min(10, "INVALID_PHONE_NUMBER")
  .max(10, "INVALID_PHONE_NUMBER")
  .regex(/^(03|05|07|08|09)[0-9]{8}$/, "INVALID_PHONE_NUMBER");

const shippingInfoSchema = z
  .object({
    phoneNumber: vietnamesePhoneNumberSchema,
    address: z
      .string({ error: "ADDRESS_TOO_SHORT" })
      .min(10, "ADDRESS_TOO_SHORT")
      .max(200, "ADDRESS_TOO_LONG"),
  })
  .passthrough();

export const checkoutSchema = z.object({
  typePayment: z.enum(["cod", "vnpay"], {
    error: "INVALID_PAYMENT_METHOD",
  }),
  shippingInfo: shippingInfoSchema,
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ShippingInfoInput = z.infer<typeof shippingInfoSchema>;
