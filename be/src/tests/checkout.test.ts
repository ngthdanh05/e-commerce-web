import request from "supertest";
import app from "../app";
import crypto from "crypto";
import { checkoutCollection } from "../models/checkout.model";
import { cartCollection } from "../models/cart.model";
import { orderCollection } from "../models/order.model";

// ============================================================================
// MOCKING MODULES & DATABASE
// ============================================================================
jest.mock("../middleware/auth", () => ({
  verifyToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    };

    next();
  },
}));

jest.mock("../models/checkout.model", () => ({
  checkoutCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/cart.model", () => ({
  cartCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/order.model", () => ({
  orderCollection: { getCollection: jest.fn() },
}));

describe("TASK 1: Checkout Shipping Validation, Empty Cart Guard & VNPay Security Test Suite", () => {
  let mockCheckoutCollection: any;
  let mockCartCollection: any;
  let mockOrderCollection: any;

  const validAuthHeader = "Bearer mock_valid_jwt_token";

  const validShippingInfo = {
    fullName: "Nguyễn Văn A",
    phoneNumber: "0912345678", // Valid 10 digits
    address: "123 Đường Lê Lợi, Quận 1, TP.HCM", // > 10 chars
    email: "test@example.com",
  };

  const validCart = {
    userId: "507f1f77bcf86cd799439011",
    products: [
      {
        productId: "507f1f77bcf86cd799439022",
        name: "Áo Thun Nam",
        price: 200000,
        quantity: 2,
      },
    ],
    totalPrice: 400000,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockCheckoutCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockCartCollection = {
      findOne: jest.fn().mockResolvedValue(validCart),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    mockOrderCollection = {
      insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    };

    (checkoutCollection.getCollection as jest.Mock).mockResolvedValue(mockCheckoutCollection);
    (cartCollection.getCollection as jest.Mock).mockResolvedValue(mockCartCollection);
    (orderCollection.getCollection as jest.Mock).mockResolvedValue(mockOrderCollection);
  });

  // ============================================================================
  // 1. EMPTY CART CHECK
  // ============================================================================
  describe("POST /api/checkout - Empty Cart Protection Guard", () => {

    it("TC_CHECKOUT_EMPTY_01: [Empty Cart] Cart rỗng (products.length === 0) -> Reject 400 EMPTY_CART_CHECKOUT_NOT_ALLOWED", async () => {
      mockCartCollection.findOne.mockResolvedValue({
        userId: "507f1f77bcf86cd799439011",
        products: [],
        totalPrice: 0,
      });

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: validShippingInfo,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/EMPTY_CART_CHECKOUT_NOT_ALLOWED|Giỏ hàng không tồn tại/i) }),
        ]),
      });
    });

    it("TC_CHECKOUT_EMPTY_02: [Cart Not Found] Giỏ hàng không tồn tại trong DB -> Reject 404 / 400", async () => {
      mockCartCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: validShippingInfo,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // 2. SHIPPING INFO VALIDATION (BVA & EP)
  // ============================================================================
  describe("POST /api/checkout - Shipping Info BVA & EP Validation", () => {

    // --------------------------------------------------------------------------
    // Phone Number Tests
    // --------------------------------------------------------------------------
    it("TC_CHECKOUT_BVA_01: [Valid Phone] Số điện thoại chuẩn 10 số đầu 09 -> Accept 200", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, phoneNumber: "0987654321" },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_CHECKOUT_BVA_02: [BVA Min- Phone] SĐT 9 chữ số -> Reject 400 INVALID_PHONE_NUMBER", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, phoneNumber: "091234567" }, // 9 digits
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: "shippingInfo.phoneNumber",
            message: expect.stringMatching(/INVALID_PHONE_NUMBER/i),
          }),
        ]),
      });
    });

    it("TC_CHECKOUT_BVA_03: [BVA Max+ Phone] SĐT 11 chữ số -> Reject 400 INVALID_PHONE_NUMBER", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, phoneNumber: "09123456789" }, // 11 digits
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "shippingInfo.phoneNumber" }),
        ])
      );
    });

    it("TC_CHECKOUT_EP_04: [EP Invalid Prefix Phone] SĐT 10 số nhưng đầu số lạ (0123456789) -> Reject 400 INVALID_PHONE_NUMBER", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, phoneNumber: "0123456789" }, // Invalid prefix 01
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    // --------------------------------------------------------------------------
    // Address BVA Tests
    // --------------------------------------------------------------------------
    it("TC_CHECKOUT_BVA_05: [BVA Min- Address] Địa chỉ 9 ký tự -> Reject 400 ADDRESS_TOO_SHORT", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, address: "Số 1 HCM" }, // 8-9 chars
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            field: "shippingInfo.address",
            message: expect.stringMatching(/ADDRESS_TOO_SHORT/i),
          }),
        ]),
      });
    });

    it("TC_CHECKOUT_BVA_06: [BVA Min Valid Address] Địa chỉ 10 ký tự -> Accept 200", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, address: "1234567890" }, // 10 chars
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_CHECKOUT_BVA_07: [BVA Max Valid Address] Địa chỉ 200 ký tự -> Accept 200", async () => {
      const longAddress200 = "A".repeat(200);

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, address: longAddress200 },
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_CHECKOUT_BVA_08: [BVA Max+ Address] Địa chỉ 201 ký tự -> Reject 400 ADDRESS_TOO_LONG", async () => {
      const longAddress201 = "A".repeat(201);

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, address: longAddress201 },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: "shippingInfo.address",
            message: expect.stringMatching(/ADDRESS_TOO_LONG/i),
          }),
        ])
      );
    });

    // --------------------------------------------------------------------------
    // Payment Type Enum Tests
    // --------------------------------------------------------------------------
    it("TC_CHECKOUT_EP_09: [Valid Payment Type] Chấp nhận 'cod' và 'vnpay' -> Accept 200", async () => {
      for (const typePayment of ["cod", "vnpay"]) {
        const response = await request(app)
          .post("/api/checkout")
          .set("Authorization", validAuthHeader)
          .send({
            typePayment,
            shippingInfo: validShippingInfo,
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it("TC_CHECKOUT_EP_10: [Invalid Payment Type] Phương thức 'paypal', '', 123 -> Reject 400 INVALID_PAYMENT_METHOD", async () => {
      const invalidTypes = ["paypal", "stripe", "", 123];

      for (const typePayment of invalidTypes) {
        const response = await request(app)
          .post("/api/checkout")
          .set("Authorization", validAuthHeader)
          .send({
            typePayment,
            shippingInfo: validShippingInfo,
          });

        expect(response.status).toBe(400);
        expect(response.body).toEqual({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({
              field: "typePayment",
              message: expect.stringMatching(/INVALID_PAYMENT_METHOD/i),
            }),
          ]),
        });
      }
    });
  });

  // ============================================================================
  // 3. VNPAY SECURITY & CALLBACK CHECKSUM
  // ============================================================================
  describe("GET /api/checkout/vnpay-callback - Checksum & Security Hash Fix", () => {

    it("TC_CHECKOUT_VNPAY_11: [Tampered Hash] Chữ ký vnp_SecureHash bị giả mạo/sai lệch -> Reject 400 INVALID_CHECKSUM", async () => {
      mockCheckoutCollection.findOne.mockResolvedValue({
        orderId: "PAY123456",
        userId: "507f1f77bcf86cd799439011",
        finalPrice: 400000,
        status: "pending",
      });

      const response = await request(app).get(
        "/api/checkout/vnpay-callback?vnp_ResponseCode=00&vnp_OrderInfo=orderId%3DPAY123456&vnp_SecureHash=INVALID_TAMPERED_HASH_STRING"
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/INVALID_CHECKSUM|Chữ ký không hợp lệ/i) }),
        ]),
      });
    });

    it("TC_CHECKOUT_VNPAY_12: [Valid Hash & Payment Success] Chữ ký hợp lệ & vnp_ResponseCode=00 -> Confirm Order Success & Reset Cart", async () => {
      const orderId = "PAY123456";
      const tmnSecret = process.env.VNP_HASHSECRET || "DXGVPNRODG7MNLJ3JNH1BWYVX7SKDCRZ";

      mockCheckoutCollection.findOne.mockResolvedValue({
        orderId,
        userId: "507f1f77bcf86cd799439011",
        finalPrice: 400000,
        status: "pending",
      });

      const queryParams: Record<string, string> = {
        vnp_Amount: "40000000",
        vnp_BankCode: "NCB",
        vnp_OrderInfo: `orderId=${orderId}`,
        vnp_ResponseCode: "00",
        vnp_TxnRef: orderId,
      };

      // Tạo chữ ký HMAC-SHA512 chuẩn
      const sortedKeys = Object.keys(queryParams).sort();
      const signData = sortedKeys
        .map((key) => `${key}=${queryParams[key]}`)
        .join("&");

      const validHash = crypto
        .createHmac("sha512", tmnSecret)
        .update(Buffer.from(signData, "utf-8"))
        .digest("hex");

      const queryString = new URLSearchParams({
        ...queryParams,
        vnp_SecureHash: validHash,
      }).toString();

      const response = await request(app).get(`/api/checkout/vnpay-callback?${queryString}`);

      // Verify redirect or status 200
      expect([200, 302]).toContain(response.status);
      expect(mockCheckoutCollection.updateOne).toHaveBeenCalledWith(
        { orderId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "success" }),
        })
      );
    });
  });
});
