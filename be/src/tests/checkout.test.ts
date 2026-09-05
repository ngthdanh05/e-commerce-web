import request from "supertest";
import crypto from "crypto";
import { checkoutCollection } from "../models/checkout.model";
import { cartCollection } from "../models/cart.model";
import { orderCollection } from "../models/order.model";
import { checkoutSchema } from "schemas/checkout.schema";
import { createCheckout } from "controllers/checkout.controller";

// ============================================================================
// MOCKING MODULES & DATABASE
// ============================================================================
// Mock đồng bộ cả relative đường dẫn và absolute path nếu dùng tsconfig alias
const mockAuth = {
  verifyToken: (req: any, res: any, next: any) => {
    req.user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      role: "user",
    };
    next();
  },
  isAdmin: (req: any, res: any, next: any) => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({
        success: false,
        errors: [{ message: "FORBIDDEN_ADMIN_ONLY" }],
      });
    }
    next();
  },
};

jest.mock("../middleware/auth", () => mockAuth);
jest.mock("middleware/auth", () => mockAuth);

// Import app sau khi đã mock middleware
import app from "../app";

jest.mock("../models/checkout.model", () => ({
  checkoutCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/cart.model", () => ({
  cartCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/order.model", () => ({
  orderCollection: { getCollection: jest.fn() },
}));

describe("SCRUM - 26: Checkout Shipping Validation, Empty Cart Guard & VNPay Security Test Suite", () => {
  let mockCheckoutCollection: any;
  let mockCartCollection: any;
  let mockOrderCollection: any;

  const validAuthHeader = "Bearer mock_valid_jwt_token";

  const validShippingInfo = {
    fullName: "Nguyễn Văn A",
    phoneNumber: "0912345678",
    address: "123 Đường Lê Lợi, Quận 1, TP.HCM",
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

    (checkoutCollection.getCollection as jest.Mock).mockResolvedValue(
      mockCheckoutCollection,
    );
    (cartCollection.getCollection as jest.Mock).mockResolvedValue(
      mockCartCollection,
    );
    (orderCollection.getCollection as jest.Mock).mockResolvedValue(
      mockOrderCollection,
    );
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
          expect.objectContaining({
            message: expect.stringMatching(
              /EMPTY_CART_CHECKOUT_NOT_ALLOWED|Giỏ hàng không tồn tại/i,
            ),
          }),
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
          shippingInfo: { ...validShippingInfo, phoneNumber: "091234567" },
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
          shippingInfo: { ...validShippingInfo, phoneNumber: "09123456789" },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "shippingInfo.phoneNumber" }),
        ]),
      );
    });

    it("TC_CHECKOUT_EP_04: [EP Invalid Prefix Phone] SĐT 10 số nhưng đầu số lạ (0123456789) -> Reject 400 INVALID_PHONE_NUMBER", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, phoneNumber: "0123456789" },
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("TC_CHECKOUT_BVA_05: [BVA Min- Address] Địa chỉ 9 ký tự -> Reject 400 ADDRESS_TOO_SHORT", async () => {
      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: { ...validShippingInfo, address: "Số 1 HCM" },
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
          shippingInfo: { ...validShippingInfo, address: "1234567890" },
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
        ]),
      );
    });

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
        "/api/checkout/vnpay-callback?vnp_ResponseCode=00&vnp_OrderInfo=orderId%3DPAY123456&vnp_SecureHash=INVALID_TAMPERED_HASH_STRING",
      );

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(
              /INVALID_CHECKSUM|Chữ ký không hợp lệ/i,
            ),
          }),
        ]),
      });
    });

    it("TC_CHECKOUT_VNPAY_12: [Valid Hash & Payment Success] Chữ ký hợp lệ & vnp_ResponseCode=00 -> Confirm Order Success & Reset Cart", async () => {
      const orderId = "PAY123456";
      const tmnSecret =
        process.env.VNP_HASHSECRET || "DXGVPNRODG7MNLJ3JNH1BWYVX7SKDCRZ";

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

      const response = await request(app).get(
        `/api/checkout/vnpay-callback?${queryString}`,
      );

      expect([200, 302]).toContain(response.status);
      expect(mockCheckoutCollection.updateOne).toHaveBeenCalledWith(
        { orderId },
        expect.objectContaining({
          $set: expect.objectContaining({ status: "success" }),
        }),
      );
    });
  });
    describe("ADDITIONAL COVERAGE TESTS", () => {
    it("TC_CHECKOUT_EXTRA_13: Thiếu VNPay Secret -> 500 VNPAY_SECRET_NOT_CONFIGURED", async () => {
      const oldSecureSecret = process.env.VNPAY_SECURE_SECRET;
      const oldHashSecret = process.env.VNP_HASHSECRET;

      delete process.env.VNPAY_SECURE_SECRET;
      delete process.env.VNP_HASHSECRET;

      const response = await request(app).get(
        "/api/checkout/vnpay-callback?vnp_ResponseCode=00&vnp_OrderInfo=orderId%3DPAY123456&vnp_SecureHash=abc",
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        errors: [{ message: "VNPAY_SECRET_NOT_CONFIGURED" }],
      });

      if (oldSecureSecret !== undefined) {
        process.env.VNPAY_SECURE_SECRET = oldSecureSecret;
      }

      if (oldHashSecret !== undefined) {
        process.env.VNP_HASHSECRET = oldHashSecret;
      }
    });

    it("TC_CHECKOUT_EXTRA_14: Hash hợp lệ nhưng order không tồn tại -> 404", async () => {
      const orderId = "PAY_NOT_FOUND";
      const tmnSecret =
        process.env.VNPAY_SECURE_SECRET ||
        process.env.VNP_HASHSECRET ||
        "TEST_SECRET";

      process.env.VNP_HASHSECRET = tmnSecret;

      mockCheckoutCollection.findOne.mockResolvedValue(null);

      const queryParams: Record<string, string> = {
        vnp_OrderInfo: `orderId=${orderId}`,
        vnp_ResponseCode: "00",
        vnp_TxnRef: orderId,
      };

      const signData = Object.keys(queryParams)
        .sort()
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

      const response = await request(app).get(
        `/api/checkout/vnpay-callback?${queryString}`,
      );

      expect(response.status).toBe(404);
    });

    it("TC_CHECKOUT_EXTRA_15: VNPay trả mã thất bại -> status failed và redirect failure", async () => {
      const orderId = "PAY_FAILED";
      const tmnSecret =
        process.env.VNPAY_SECURE_SECRET ||
        process.env.VNP_HASHSECRET ||
        "TEST_SECRET";

      process.env.VNP_HASHSECRET = tmnSecret;

      mockCheckoutCollection.findOne.mockResolvedValue({
        orderId,
        userId: "507f1f77bcf86cd799439011",
        finalPrice: 400000,
        status: "pending",
      });

      const queryParams: Record<string, string> = {
        vnp_OrderInfo: `orderId=${orderId}`,
        vnp_ResponseCode: "01",
        vnp_TxnRef: orderId,
      };

      const signData = Object.keys(queryParams)
        .sort()
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

      const response = await request(app).get(
        `/api/checkout/vnpay-callback?${queryString}`,
      );

      expect(response.status).toBe(302);

      expect(mockCheckoutCollection.updateOne).toHaveBeenCalledWith(
        { orderId },
        { $set: { status: "failed" } },
      );

      expect(response.headers.location).toContain(
        `/checkout-failure?orderId=${orderId}`,
      );
    });

    it("TC_CHECKOUT_EXTRA_16: createCheckout gặp lỗi DB -> 500 INTERNAL_SERVER_ERROR", async () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (checkoutCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("Mock DB error"),
      );

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: validShippingInfo,
        });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "INTERNAL_SERVER_ERROR",
      });

      consoleSpy.mockRestore();
    });

    it("TC_CHECKOUT_EXTRA_17: VNPay callback gặp lỗi DB -> 500 INTERNAL_SERVER_ERROR", async () => {
      const orderId = "PAY_CALLBACK_ERROR";

      const tmnSecret =
        process.env.VNPAY_SECURE_SECRET ||
        process.env.VNP_HASHSECRET ||
        "TEST_SECRET";

      process.env.VNP_HASHSECRET = tmnSecret;

      const queryParams: Record<string, string> = {
        vnp_OrderInfo: `orderId=${orderId}`,
        vnp_ResponseCode: "00",
        vnp_TxnRef: orderId,
      };

      const signData = Object.keys(queryParams)
        .sort()
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

      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (checkoutCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("Mock callback DB error"),
      );

      const response = await request(app).get(
        `/api/checkout/vnpay-callback?${queryString}`,
      );

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        error: "INTERNAL_SERVER_ERROR",
      });

      consoleSpy.mockRestore();
    });
        it("TC_CHECKOUT_EXTRA_18: Query param dạng array -> bỏ qua value không phải string", async () => {
      const tmnSecret =
        process.env.VNPAY_SECURE_SECRET ||
        process.env.VNP_HASHSECRET ||
        "TEST_SECRET";

      process.env.VNP_HASHSECRET = tmnSecret;

      const response = await request(app).get(
        "/api/checkout/vnpay-callback" +
          "?vnp_ResponseCode=00" +
          "&vnp_OrderInfo=orderId%3DPAY_ARRAY" +
          "&testArray=value1" +
          "&testArray=value2" +
          "&vnp_SecureHash=INVALID_HASH"
      );

      expect(response.status).toBe(400);

      expect(response.body).toEqual({
        success: false,
        errors: [
          {
            message: "INVALID_CHECKSUM",
          },
        ],
      });
    });
        it("TC_CHECKOUT_EXTRA_19: products không phải Array -> Reject EMPTY_CART", async () => {
      mockCartCollection.findOne.mockResolvedValue({
        userId: "507f1f77bcf86cd799439011",
        products: null,
        totalPrice: 400000,
        finalPrice: 400000,
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
        errors: [
          {
            message: "EMPTY_CART_CHECKOUT_NOT_ALLOWED",
          },
        ],
      });
    });

    it("TC_CHECKOUT_EXTRA_20: products có dữ liệu nhưng totalPrice = 0 -> Reject EMPTY_CART", async () => {
      mockCartCollection.findOne.mockResolvedValue({
        ...validCart,
        products: [
          {
            productId: "507f1f77bcf86cd799439012",
            quantity: 1,
          },
        ],
        totalPrice: 0,
        finalPrice: 0,
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
        errors: [
          {
            message: "EMPTY_CART_CHECKOUT_NOT_ALLOWED",
          },
        ],
      });
    });
        it("TC_CHECKOUT_EXTRA_21: Ép schema cho payment type không hợp lệ -> fallback 400", async () => {
      const schemaSpy = jest
        .spyOn(checkoutSchema, "safeParse")
        .mockReturnValueOnce({
          success: true,
          data: {
            typePayment: "paypal",
            shippingInfo: validShippingInfo,
          },
        } as any);

      mockCartCollection.findOne.mockResolvedValue({
        ...validCart,
        products: [
          {
            productId: "507f1f77bcf86cd799439012",
            quantity: 1,
          },
        ],
        totalPrice: 400000,
        finalPrice: 400000,
      });

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "paypal",
          shippingInfo: validShippingInfo,
        });

      expect(response.status).toBe(400);

      expect(response.body).toEqual({
        error: "Loại thanh toán không hợp lệ",
      });

      schemaSpy.mockRestore();
    });
        it("TC_CHECKOUT_EXTRA_22: cart.products trở thành undefined khi tạo orderData -> fallback []", async () => {
      let productsAccessCount = 0;

      const dynamicCart = {
        userId: "507f1f77bcf86cd799439011",
        totalPrice: 400000,
        finalPrice: 400000,

        get products() {
          productsAccessCount++;

          // Lần 1: Array.isArray(cart.products)
          // Lần 2: cart.products.length
          if (productsAccessCount <= 2) {
            return [
              {
                productId: "507f1f77bcf86cd799439012",
                quantity: 1,
              },
            ];
          }

          // Lần 3: products: cart.products || []
          return undefined;
        },
      };

      mockCartCollection.findOne.mockResolvedValue(dynamicCart);

      const response = await request(app)
        .post("/api/checkout")
        .set("Authorization", validAuthHeader)
        .send({
          typePayment: "cod",
          shippingInfo: validShippingInfo,
        });

      expect(response.status).toBe(200);

      expect(mockCheckoutCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [],
        }),
      );
    });
        it("TC_CHECKOUT_EXTRA_23: req.ip không tồn tại -> sử dụng IP mặc định 127.0.0.1", async () => {
      mockCartCollection.findOne.mockResolvedValue({
        ...validCart,
        products: [
          {
            productId: "507f1f77bcf86cd799439012",
            quantity: 1,
          },
        ],
        totalPrice: 400000,
        finalPrice: 400000,
      });

      const mockReq = {
        body: {
          typePayment: "vnpay",
          shippingInfo: validShippingInfo,
        },
        user: {
          _id: "507f1f77bcf86cd799439011",
        },

        // Quan trọng:
        // không khai báo ip để req.ip === undefined
      } as any;

      const status = jest.fn().mockReturnThis();
      const json = jest.fn().mockReturnThis();

      const mockRes = {
        status,
        json,
      } as any;

      await createCheckout(mockReq, mockRes);

      expect(status).toHaveBeenCalledWith(200);
    });
  });

});
