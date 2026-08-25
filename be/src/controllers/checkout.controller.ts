import { Request, Response } from "express";
import { AuthRequest } from "middleware/auth";
import { cartCollection } from "models/cart.model";
import { checkoutCollection } from "models/checkout.model";
import { orderCollection } from "models/order.model";
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from "vnpay";
import { checkoutSchema } from "schemas/checkout.schema";
import crypto from "crypto";

function generatePayID() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `PAY${timestamp}${seconds}${milliseconds}`;
}
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const validation = checkoutSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const { typePayment, shippingInfo } = validation.data;
    const userId = req.user?._id;

    const checkoutCol = await checkoutCollection.getCollection();
    const cartCol = await cartCollection.getCollection();
    const orderCol = await orderCollection.getCollection();

    const cart = await cartCol.findOne({ userId });

    if (!cart) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            message: "EMPTY_CART_CHECKOUT_NOT_ALLOWED",
          },
        ],
      });
    }

    const totalPrice = Number(cart.totalPrice) || 0;

    if (
      !Array.isArray(cart.products) ||
      cart.products.length === 0 ||
      totalPrice === 0
    ) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            message: "EMPTY_CART_CHECKOUT_NOT_ALLOWED",
          },
        ],
      });
    }

    const finalPrice = Number(cart.finalPrice) || totalPrice;
    const orderId = generatePayID();

    const orderData = {
      orderId,
      userId,
      products: cart.products || [],
      finalPrice,
      shippingInfo,
      paymentMethod: typePayment,
      status: "pending",
      createdAt: new Date(),
    };

    if (typePayment === "cod") {
      await checkoutCol.insertOne(orderData);
      await orderCol.insertOne({
        ...orderData,
      });

      await cartCol.updateOne({ userId }, { $set: emptyCart() });

      return res.status(200).json({
        success: true,
        message: "Đơn COD đã tạo thành công",
        orderId,
        metadata: { order: orderData },
      });
    }

    if (typePayment === "vnpay") {
      await checkoutCol.insertOne(orderData);

      await orderCol.insertOne({
        ...orderData,
        status: "success",
        paidAt: new Date(),
      });

      await checkoutCol.updateOne(
        { orderId },
        { $set: { status: "success", paidAt: new Date() } }
      );

      const vnpay = new VNPay({
        tmnCode: process.env.VNPAY_TMN_CODE!,
        secureSecret: process.env.VNPAY_SECURE_SECRET!,
        vnpayHost: process.env.VNPAY_HOST!,
        testMode: true,
        loggerFn: ignoreLogger,
      });

      const paymentUrl = vnpay.buildPaymentUrl({
        vnp_Amount: finalPrice,
        vnp_IpAddr: req.ip || "127.0.0.1",
        vnp_ReturnUrl: "http://localhost:3000/api/checkout/vnpay-callback",
        vnp_TxnRef: orderId,
        vnp_OrderInfo: `orderId=${orderId}`,
        vnp_OrderType: ProductCode.Other,
        vnp_Locale: VnpLocale.VN,
        vnp_CreateDate: dateFormat(new Date()),
        vnp_ExpireDate: dateFormat(new Date(Date.now() + 86400000)),
      });

      return res.status(200).json({
        success: true,
        message: "Tạo đơn hàng VNPAY thành công",
        paymentUrl,
        orderId,
      });
    }

    return res.status(400).json({ error: "Loại thanh toán không hợp lệ" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

function emptyCart() {
  return {
    products: [],
    totalPrice: 0,
    finalPrice: 0,
    fullName: "",
    phoneNumber: "",
    address: "",
    email: "",
  };
}

export const vnpayCallback = async (req: Request, res: Response) => {
  try {
    const query = req.query;

      const secureHash = query["vnp_SecureHash"] as string;

      const tmnSecret =
        process.env.VNPAY_SECURE_SECRET ||
        process.env.VNP_HASHSECRET;

      if (!tmnSecret) {
        return res.status(500).json({
          success: false,
          errors: [
            {
              message: "VNPAY_SECRET_NOT_CONFIGURED",
            },
          ],
        });
      }

    const cloned: Record<string, string> = {};

    for (const [key, value] of Object.entries(query)) {
      if (key === "vnp_SecureHash" || key === "vnp_SecureHashType") {
        continue;
      }

      if (typeof value === "string") {
        cloned[key] = value;
      }
    }

    const sortedKeys = Object.keys(cloned).sort();

    const sorted = sortedKeys
      .map((key) => `${key}=${cloned[key]}`)
      .join("&");

    const signData = crypto
      .createHmac("sha512", tmnSecret)
      .update(Buffer.from(sorted, "utf-8"))
      .digest("hex");

    if (
      !secureHash ||
      secureHash.toLowerCase() !== signData.toLowerCase()
    ) {
      return res.status(400).json({
        success: false,
        errors: [
          {
            message: "INVALID_CHECKSUM",
          },
        ],
      });
    }

    const vnp_ResponseCode = query["vnp_ResponseCode"];
    const orderInfo = query["vnp_OrderInfo"] as string;

    const orderId = orderInfo.replace("orderId=", "");

    const checkoutCol = await checkoutCollection.getCollection();
    const cartCol = await cartCollection.getCollection();

    const order = await checkoutCol.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "Đơn hàng không tồn tại" });
    }

    if (vnp_ResponseCode === "00") {
      await checkoutCol.updateOne(
        { orderId },
        { $set: { status: "success", paidAt: new Date() } }
      );

      await cartCol.deleteOne({ userId: order.userId });
      await cartCol.insertOne({
        userId: order.userId,
        products: [],
        totalPrice: 0,
        finalPrice: 0,
        fullName: "",
        phoneNumber: "",
        address: "",
        email: "",
      });
      return res.redirect(
        `http://localhost:5173/checkout-success?orderId=${orderId}`
      );
    }

    await checkoutCol.updateOne({ orderId }, { $set: { status: "failed" } });

    return res.redirect(
      `http://localhost:5173/checkout-failure?orderId=${orderId}`
    );
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: "INTERNAL_SERVER_ERROR",
    });
  }
};
