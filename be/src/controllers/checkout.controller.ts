import { Request, Response } from "express";
import { AuthRequest } from "middleware/auth";
import { cartCollection } from "models/cart.model";
import { checkoutCollection } from "models/checkout.model";
import { orderCollection } from "models/order.model";
import { VNPay, ignoreLogger, ProductCode, VnpLocale, dateFormat } from "vnpay";
// import querystring from "qs";
// import crypto from "crypto";

function generatePayID() {
  const now = new Date();
  const timestamp = now.getTime();
  const seconds = now.getSeconds().toString().padStart(2, "0");
  const milliseconds = now.getMilliseconds().toString().padStart(3, "0");
  return `PAY${timestamp}${seconds}${milliseconds}`;
}
export const createCheckout = async (req: AuthRequest, res: Response) => {
  try {
    const { typePayment, shippingInfo } = req.body;
    const userId = req.user?._id;

    const checkoutCol = await checkoutCollection.getCollection();
    const cartCol = await cartCollection.getCollection();
    const orderCol = await orderCollection.getCollection();

    const cart = await cartCol.findOne({ userId });
    if (!cart) return res.status(404).json({ error: "Giỏ hàng không tồn tại" });

    const totalPrice = Number(cart.totalPrice) || 0;
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
        tmnCode: "E5GKRD4W",
        secureSecret: "DXGVPNRODG7MNLJ3JNH1BWYVX7SKDCRZ",
        vnpayHost: "https://sandbox.vnpayment.vn",
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

    // const secureHash = query["vnp_SecureHash"];
    // const tmnSecret = "DXGVPNRODG7MNLJ3JNH1BWYVX7SKDCRZ";

    // let cloned = { ...query };
    // delete cloned["vnp_SecureHash"];
    // delete cloned["vnp_SecureHashType"];

    // const sorted = querystring.stringify(cloned, { encode: false });
    // const signData = crypto
    //   .createHmac("sha512", tmnSecret)
    //   .update(sorted)
    //   .digest("hex");

    // if (secureHash !== signData) {
    //   return res.status(400).json({ error: "Chữ ký không hợp lệ" });
    // }

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
