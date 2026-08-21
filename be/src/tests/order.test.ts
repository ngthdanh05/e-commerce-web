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

describe("TASK 2: Order State Machine Enforcement & Admin Control Security Test Suite", () => {
  let mockOrderCollection: any;
  let mockUserCollection: any;

  const normalUserId = "507f1f77bcf86cd799439011";
  const otherUserId = "507f1f77bcf86cd799439099";
  const adminUserId = "507f1f77bcf86cd799439088";

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

    (orderCollection.getCollection as jest.Mock).mockResolvedValue(mockOrderCollection);
    (userCollection.getCollection as jest.Mock).mockResolvedValue(mockUserCollection);

    // Mock JWT decode default
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
        .get("/api/orders/admin")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/FORBIDDEN_ADMIN_ONLY/i) }),
        ]),
      });
    });

    it("TC_ORDER_AUTH_02: [Admin Guard] Admin truy cập GET /api/orders/admin -> Accept 200", async () => {
      const response = await request(app)
        .get("/api/orders/admin")
        .set("Authorization", adminUserToken);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC_ORDER_AUTH_03: [Ownership Guard] User A cố tình xóa đơn hàng của User B (userId !== req.user._id) -> Reject 403 FORBIDDEN", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY999999",
        userId: otherUserId, // Thuộc về User B
        status: "pending",
      });

      const response = await request(app)
        .delete("/api/orders/PAY999999")
        .set("Authorization", normalUserToken); // User A gọi API

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/FORBIDDEN/i) }),
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
        orderId: "PAY111111",
        userId: normalUserId,
        status: "pending",
      });

      const response = await request(app)
        .delete("/api/orders/PAY111111")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(200);
      expect(mockOrderCollection.deleteOne).toHaveBeenCalledWith({ orderId: "PAY111111" });
      expect(response.body.success).toBe(true);
    });

    it("TC_ORDER_DEL_05: [Invalid Delete Active] Đơn hàng đang ở trạng thái 'shipping' -> Reject 400 CANNOT_DELETE_ACTIVE_ORDER", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY222222",
        userId: normalUserId,
        status: "shipping",
      });

      const response = await request(app)
        .delete("/api/orders/PAY222222")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/CANNOT_DELETE_ACTIVE_ORDER|Order cannot be deleted/i) }),
        ]),
      });
    });

    it("TC_ORDER_DEL_06: [Invalid Delete Active] Đơn hàng đã ở trạng thái 'success' -> Reject 400 CANNOT_DELETE_ACTIVE_ORDER", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY333333",
        userId: normalUserId,
        status: "success",
      });

      const response = await request(app)
        .delete("/api/orders/PAY333333")
        .set("Authorization", normalUserToken);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  // ============================================================================
  // 3. ORDER STATE MACHINE & TRANSITION RULES
  // ============================================================================
  describe("PUT /api/orders/admin/:id - Status Transitions (State Machine)", () => {

    it("TC_ORDER_STATE_07: [Valid Transition] Admin chuyển trạng thái từ 'pending' sang 'processing' / 'shipping' / 'success' -> Accept 200", async () => {
      const validTransitions = ["processing", "shipping", "success"];

      for (const newStatus of validTransitions) {
        mockOrderCollection.findOne.mockResolvedValue({
          orderId: "PAY444444",
          status: "pending",
        });

        const response = await request(app)
          .put("/api/orders/admin/PAY444444")
          .set("Authorization", adminUserToken)
          .send({ status: newStatus });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      }
    });

    it("TC_ORDER_STATE_08: [Illegal Transition] Admin chuyển ngược từ 'success' về 'pending' -> Reject 400 ILLEGAL_STATUS_TRANSITION", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY555555",
        status: "success", // Trạng thái hiện tại đã hoàn tất
      });

      const response = await request(app)
        .put("/api/orders/admin/PAY555555")
        .set("Authorization", adminUserToken)
        .send({ status: "pending" }); // Chuyển ngược bất hợp lệ

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/ILLEGAL_STATUS_TRANSITION|INVALID_STATUS/i) }),
        ]),
      });
    });

    it("TC_ORDER_STATE_09: [Illegal Transition] Admin chuyển ngược từ 'failed' về 'pending' -> Reject 400 ILLEGAL_STATUS_TRANSITION", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY666666",
        status: "failed",
      });

      const response = await request(app)
        .put("/api/orders/admin/PAY666666")
        .set("Authorization", adminUserToken)
        .send({ status: "pending" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it("TC_ORDER_STATE_10: [Invalid Enum Status] Truyền status không thuộc Enum ('unknown_status', '') -> Reject 400 INVALID_STATUS", async () => {
      mockOrderCollection.findOne.mockResolvedValue({
        orderId: "PAY777777",
        status: "pending",
      });

      const response = await request(app)
        .put("/api/orders/admin/PAY777777")
        .set("Authorization", adminUserToken)
        .send({ status: "invalid_status_value" });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        errors: expect.arrayContaining([
          expect.objectContaining({ message: expect.stringMatching(/INVALID_STATUS/i) }),
        ]),
      });
    });
  });
});
