import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { orderCollection } from "../models/order.model";
import { userCollection } from "../models/user.model";

// ============================================================================
// MOCKING MODULES & DATABASE
// ============================================================================
jest.mock("jsonwebtoken", () => ({
  verify: jest.fn(),
}));

jest.mock("../models/order.model", () => ({
  orderCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/user.model", () => ({
  userCollection: { getCollection: jest.fn() },
}));

describe("SCRUM - 27: Order State Machine Enforcement & Admin Control Security Test Suite", () => {
  let mockOrderCollection: any;
  let mockUserCollection: any;

  const normalUserId = "507f1f77bcf86cd799439011";
  const otherUserId = "507f1f77bcf86cd799439099";
  const adminUserId = "507f1f77bcf86cd799439088";

  // MongoDB ObjectId hợp lệ (24 ký tự hex)
  const validOrderId1 = "650c5d1f1f77bcf86cd79001";
  const validOrderId2 = "650c5d1f1f77bcf86cd79002";
  const validOrderId3 = "650c5d1f1f77bcf86cd79003";
  const validOrderId4 = "650c5d1f1f77bcf86cd79004";

  const normalUserToken = "Bearer mock_normal_user_jwt_token";
  const adminUserToken = "Bearer mock_admin_user_jwt_token";

  beforeEach(() => {
    jest.clearAllMocks();

    mockOrderCollection = {
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      countDocuments: jest.fn().mockResolvedValue(0),
    };

    mockUserCollection = {
      find: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    };

    (orderCollection.getCollection as jest.Mock).mockResolvedValue(
      mockOrderCollection,
    );
    (userCollection.getCollection as jest.Mock).mockResolvedValue(
      mockUserCollection,
    );

    // Mock JWT decode
    (jwt.verify as jest.Mock).mockImplementation((token: string) => {
      if (token === "mock_admin_user_jwt_token") {
        return { _id: adminUserId, email: "admin@example.com", role: "admin" };
      }
      return { _id: normalUserId, email: "user@example.com", role: "user" };
    });
  });

  // ============================================================================
  // 1. AUTHORIZATION GUARDS & ADMIN SECURITY
  // ============================================================================
  describe("Authorization Guards - User Ownership & Admin Only Rules", () => {
    it("TC_ORDER_AUTH_01: [Admin Guard] User thường không phải Admin truy cập GET /api/orders/admin -> Reject 403 FORBIDDEN_ADMIN_ONLY", async () => {
      const response = await request(app)
        .get("/api/admin/orders")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(/FORBIDDEN_ADMIN_ONLY|FORBIDDEN/i),
          }),
        ]),
      });
    });

    it("TC_ORDER_AUTH_02: [Admin Guard] Admin truy cập GET /api/orders/admin -> Accept 200", async () => {
      const response = await request(app)
        .get("/api/admin/orders")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
    });

    it("TC_ORDER_AUTH_03: [Ownership Guard] User A cố tình xóa đơn hàng của User B (userId !== req.user._id) -> Reject 403 FORBIDDEN", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId1,
        orderId: "PAY999999",
        userId: otherUserId, // Thuộc về User B
        status: "pending",
      });

      const response = await request(app)
        .delete(`/api/orders/${validOrderId1}`)
        .set("Authorization", normalUserToken); // User A gọi API

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(/FORBIDDEN|UNAUTHORIZED/i),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // 2. ORDER DELETION GUARD & POLICY
  // ============================================================================
  describe("DELETE /api/orders/:id - Order Deletion Status Guard", () => {
    it("TC_ORDER_DEL_04: [Valid Delete] User xóa đơn hàng của chính mình khi status === 'pending' -> Accept 200", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId1,
        orderId: "PAY111111",
        userId: normalUserId,
        status: "pending",
      });

      const response = await request(app)
        .delete(`/api/orders/${validOrderId1}`)
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
    });

    it("TC_ORDER_DEL_05: [Invalid Delete Active] Đơn hàng đang ở trạng thái 'shipping' -> Reject 400 CANNOT_DELETE_ACTIVE_ORDER", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId2,
        orderId: "PAY222222",
        userId: normalUserId,
        status: "shipping",
      });

      const response = await request(app)
        .delete(`/api/orders/${validOrderId2}`)
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(
              /CANNOT_DELETE_ACTIVE_ORDER|Order cannot be deleted/i,
            ),
          }),
        ]),
      });
    });

    it("TC_ORDER_DEL_06: [Invalid Delete Active] Đơn hàng đã ở trạng thái 'success' -> Reject 400 CANNOT_DELETE_ACTIVE_ORDER", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId3,
        orderId: "PAY333333",
        userId: normalUserId,
        status: "success",
      });

      const response = await request(app)
        .delete(`/api/orders/${validOrderId3}`)
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  // ============================================================================
  // 3. ORDER STATE MACHINE & TRANSITION RULES
  // ============================================================================
  describe("PUT /api/admin/orders/:id - Status Transitions (State Machine)", () => {
    it("TC_ORDER_STATE_07: [Valid Transition] Admin chuyển trạng thái từ 'pending' sang 'processing' / 'shipping' / 'success' -> Accept 200", async () => {
      const validTransitions = ["processing", "shipping", "success"];

      for (const newStatus of validTransitions) {
        mockOrderCollection.findOne.mockResolvedValue({
          _id: validOrderId4,
          orderId: "PAY444444",
          status: "pending",
        });

        const response = await request(app)
          .put(`/api/admin/orders/${validOrderId4}`)
          .set("Authorization", adminUserToken)
          .send({ status: newStatus });

        expect(response.status).toBe(200);
      }
    });

    it("TC_ORDER_STATE_08: [Illegal Transition] Admin chuyển ngược từ 'success' về 'pending' -> Reject 400 ILLEGAL_STATUS_TRANSITION", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId4,
        orderId: "PAY555555",
        status: "success",
      });

      const response = await request(app)
        .put(`/api/admin/orders/${validOrderId4}`)
        .set("Authorization", adminUserToken)
        .send({ status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(
              /ILLEGAL_STATUS_TRANSITION|INVALID_STATUS/i,
            ),
          }),
        ]),
      });
    });

    it("TC_ORDER_STATE_09: [Illegal Transition] Admin chuyển ngược từ 'failed' về 'pending' -> Reject 400 ILLEGAL_STATUS_TRANSITION", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId4,
        orderId: "PAY666666",
        status: "failed",
      });

      const response = await request(app)
        .put(`/api/admin/orders/${validOrderId4}`)
        .set("Authorization", adminUserToken)
        .send({ status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it("TC_ORDER_STATE_10: [Invalid Enum Status] Truyền status không thuộc Enum ('unknown_status', '') -> Reject 400 INVALID_STATUS", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        _id: validOrderId4,
        orderId: "PAY777777",
        status: "pending",
      });

      const response = await request(app)
        .put(`/api/admin/orders/${validOrderId4}`)
        .set("Authorization", adminUserToken)
        .send({ status: "invalid_status_value" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringMatching(/INVALID_STATUS/i),
          }),
        ]),
      });
    });
  });

  // ============================================================================
  // 4. ADDITIONAL COVERAGE TESTS FOR 100% STATEMENTS & BRANCHES
  // ============================================================================
  describe("Additional Coverage Tests", () => {
    it("TC_ORD_ADD_01: [getOrderForAdmin] Trả về danh sách và map thông tin user", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: normalUserId,
          status: "pending",
          finalPrice: 100,
          createdAt: new Date(),
          paymentMethod: "Credit Card",
        },
      ]);
      mockUserCollection.toArray.mockResolvedValueOnce([
        {
          _id: normalUserId,
          name: "Test User",
          email: "user@example.com",
        },
      ]);

      const response = await request(app)
        .get("/api/admin/orders?page=1&limit=10")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.orders[0].user).toEqual({
        fullName: "Test User",
        email: "user@example.com",
      });
      expect(response.body.pagination).toBeDefined();
    });

    it("TC_ORD_ADD_01B: [getOrderForAdmin] Trả về danh sách, có user rỗng (branch user ? ... : null)", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: null,
          status: "pending",
          totalPrice: 200,
          createdAt: new Date(),
          paymentMethod: "Credit Card",
        },
      ]);
      mockUserCollection.toArray.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/orders?page=1&limit=10")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
      expect(response.body.orders[0].user).toBeNull();
      expect(response.body.orders[0].amount).toBe(200);
    });

    it("TC_ORD_ADD_01C: [getOrderForAdmin] Trả về danh sách, không có finalPrice và totalPrice -> 0", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: null,
          status: "pending",
          createdAt: new Date(),
          paymentMethod: "Credit Card",
        },
      ]);
      mockUserCollection.toArray.mockResolvedValueOnce([]);

      const response = await request(app)
        .get("/api/admin/orders?page=1&limit=10")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
      expect(response.body.orders[0].amount).toBe(0);
    });

    it("TC_ORD_ADD_02: [updateOrderForAdmin] Không tìm thấy đơn hàng cần update -> Reject 404", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .put(`/api/admin/orders/${validOrderId1}`)
        .set("Authorization", adminUserToken)
        .send({ status: "processing" });

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("ORDER_NOT_FOUND");
    });

    it("TC_ORD_ADD_03: [updateOrderForAdmin] Cập nhật không thành công (modifiedCount === 0) -> Reject 400", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        _id: validOrderId1,
        status: "pending",
      });
      mockOrderCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0 });

      const response = await request(app)
        .put(`/api/admin/orders/${validOrderId1}`)
        .set("Authorization", adminUserToken)
        .send({ status: "processing" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("ORDER_NOT_UPDATED");
    });

    it("TC_ORD_ADD_03B: [updateOrderForAdmin] Sử dụng orderId là string thay vì ObjectId 24 ký tự", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        _id: validOrderId1,
        orderId: "PAY_STRING_ID",
        status: "pending",
      });
      mockOrderCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });

      const response = await request(app)
        .put(`/api/admin/orders/PAY_STRING_ID`)
        .set("Authorization", adminUserToken)
        .send({ status: "processing" });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_ORD_ADD_04: [deleteOrderForAdmin] Admin xóa đơn hàng thành công -> Accept 200", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        orderId: "PAY123",
      });
      mockOrderCollection.deleteOne.mockResolvedValueOnce({ deletedCount: 1 });

      const response = await request(app)
        .delete("/api/admin/orders/PAY123")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_ORD_ADD_04_404: [deleteOrderForAdmin] Admin xóa đơn hàng không tồn tại -> 404", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete("/api/admin/orders/PAY_NOT_FOUND")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(404);
    });

    it("TC_ORD_ADD_05: [getAllOrders] Lấy danh sách đơn hàng có filter status hợp lệ", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: normalUserId,
          status: "pending",
          finalPrice: 100,
          createdAt: new Date(),
          paymentMethod: "Credit Card",
          products: [],
        },
      ]);

      const response = await request(app)
        .get("/api/orders?status=pending")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
      expect(response.body.orders.length).toBe(1);
    });

    it("TC_ORD_ADD_09: [getAllOrders] Lấy danh sách đơn hàng không có status filter hoặc status không hợp lệ", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: normalUserId,
          status: "pending",
          totalPrice: 150,
        },
      ]);

      const response = await request(app)
        .get("/api/orders?status=invalid_status")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
      expect(response.body.orders[0].amount).toBe(150);
    });

    it("TC_ORD_ADD_09B: [getAllOrders] Đơn hàng không có finalPrice và totalPrice -> 0", async () => {
      mockOrderCollection.countDocuments.mockResolvedValueOnce(1);
      mockOrderCollection.toArray.mockResolvedValueOnce([
        {
          _id: validOrderId1,
          orderId: "PAY123",
          userId: normalUserId,
          status: "pending",
        },
      ]);

      const response = await request(app)
        .get("/api/orders")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
      expect(response.body.orders[0].amount).toBe(0);
    });

    it("TC_ORD_ADD_06: [getOrderById] Lấy chi tiết đơn hàng theo ID và chuẩn hóa status (state)", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        orderId: "PAY123",
        status: { state: "processing" },
        finalPrice: 100,
        createdAt: new Date(),
        paymentMethod: "Credit Card",
        products: [],
        userId: normalUserId,
      });

      const response = await request(app)
        .get("/api/orders/PAY123")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
      expect(response.body.order.status).toBe("processing");
    });

    it("TC_ORD_ADD_14: [getOrderById] Kiểm tra chuẩn hóa status - string", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        orderId: "123",
        status: "success",
        totalPrice: 50,
      });
      const response = await request(app)
        .get("/api/orders/123")
        .set("Authorization", normalUserToken);
      expect(response.body.order.status).toBe("success");
      expect(response.body.order.amount).toBe(50);
    });

    it("TC_ORD_ADD_15: [getOrderById] Kiểm tra chuẩn hóa status - value object", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        orderId: "123",
        status: { value: "failed" },
      });
      const response = await request(app)
        .get("/api/orders/123")
        .set("Authorization", normalUserToken);
      expect(response.body.order.status).toBe("failed");
    });

    it("TC_ORD_ADD_16: [getOrderById] Kiểm tra chuẩn hóa status - unknown -> pending", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce({
        orderId: "123",
        status: {},
      });
      const response = await request(app)
        .get("/api/orders/123")
        .set("Authorization", normalUserToken);
      expect(response.body.order.status).toBe("pending");
      expect(response.body.order.amount).toBe(0);
    });

    it("TC_ORD_ADD_06_404: [getOrderById] Lấy chi tiết đơn hàng theo ID không tồn tại -> 404", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .get("/api/orders/PAY123")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(404);
    });

    it("TC_ORD_ADD_07: [deleteOrder] Kiểm tra sai định dạng ObjectId -> Reject 400", async () => {
      const response = await request(app)
        .delete("/api/orders/invalid_id")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("INVALID_ORDER_ID");
    });

    it("TC_ORD_ADD_08: [deleteOrder] Không tìm thấy đơn hàng trong DB -> Reject 404", async () => {
      mockOrderCollection.findOne.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete(`/api/orders/${validOrderId1}`)
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("ORDER_NOT_FOUND");
    });

    it("TC_ORD_ADD_10: [createOrder] Tạo đơn hàng thành công -> 200 OK", async () => {
      const { createOrder } = require("../controllers/order.controller");
      mockOrderCollection.insertOne = jest
        .fn()
        .mockResolvedValueOnce({ insertedId: validOrderId1 });

      const req = {
        user: { _id: normalUserId },
        body: {
          orderId: "PAY123",
          amount: 100,
          paymentMethod: "Credit Card",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      await createOrder(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, orderId: "PAY123" }),
      );
    });

    it("TC_ORD_ADD_11_UNAUTH: [getAllOrders] Kiểm tra mất userId -> 401", async () => {
      const { getAllOrders } = require("../controllers/order.controller");
      const req = {
        user: {}, // missing _id
        query: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await getAllOrders(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("TC_ORD_ADD_12_UNAUTH: [createOrder] Kiểm tra mất userId -> 400", async () => {
      const { createOrder } = require("../controllers/order.controller");
      const req = {
        user: {}, // missing _id
        body: { orderId: "PAY123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await createOrder(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("TC_ORD_ADD_13_UNAUTH: [deleteOrder] Kiểm tra mất userId -> 401", async () => {
      const { deleteOrder } = require("../controllers/order.controller");
      const req = {
        user: {}, // missing _id
        params: { id: validOrderId1 },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await deleteOrder(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it("TC_ORD_CATCH_ERR: Kiểm tra block catch(error) ném lỗi 500", async () => {
      mockOrderCollection.find.mockImplementationOnce(() => {
        throw new Error("DB Connection Error");
      });
      const res1 = await request(app)
        .get("/api/orders")
        .set("Authorization", normalUserToken);
      expect(res1.status).toBe(500);

      mockOrderCollection.find.mockImplementationOnce(() => {
        throw new Error("DB Connection Error");
      });
      const res2 = await request(app)
        .get("/api/admin/orders")
        .set("Authorization", adminUserToken);
      expect(res2.status).toBe(500);

      mockOrderCollection.findOne.mockRejectedValueOnce(new Error("DB Error"));
      const res3 = await request(app)
        .put(`/api/admin/orders/${validOrderId1}`)
        .set("Authorization", adminUserToken)
        .send({ status: "processing" });
      expect(res3.status).toBe(500);

      mockOrderCollection.findOne.mockRejectedValueOnce(new Error("DB Error"));
      const res4 = await request(app)
        .delete("/api/admin/orders/PAY123")
        .set("Authorization", adminUserToken);
      expect(res4.status).toBe(500);

      mockOrderCollection.findOne.mockRejectedValueOnce(new Error("DB Error"));
      const res5 = await request(app)
        .get("/api/orders/PAY123")
        .set("Authorization", normalUserToken);
      expect(res5.status).toBe(500);

      mockOrderCollection.findOne.mockRejectedValueOnce(new Error("DB Error"));
      const res6 = await request(app)
        .delete(`/api/orders/${validOrderId1}`)
        .set("Authorization", normalUserToken);
      expect(res6.status).toBe(500);

      const { createOrder } = require("../controllers/order.controller");
      mockOrderCollection.insertOne = jest
        .fn()
        .mockRejectedValueOnce(new Error("DB Error"));

      const req = {
        user: { _id: normalUserId },
        body: { orderId: "123" },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      await createOrder(req as any, res as any);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
