import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { cartCollection } from "../models/cart.model";
import { productCollection } from "../models/product.model";

// ============================================================================
// MOCKING MODELS
// ============================================================================
jest.mock("../models/cart.model", () => ({
  cartCollection: {
    getCollection: jest.fn(),
  },
}));

jest.mock("../models/product.model", () => ({
  productCollection: {
    getCollection: jest.fn(),
  },
}));

describe("SCRUM-22: Cart Quantity Boundaries & Price Guard Test Suite", () => {
  let mockCartCollection: any;
  let mockProductCollection: any;
  let validToken: string;

  beforeEach(() => {
    jest.clearAllMocks();

    // Tạo JWT token hợp lệ đầy đủ payload để vượt qua Middleware Auth
    const secret = process.env.JWT_SECRET || "default_secret";
    validToken = jwt.sign(
      { userId: "mock_user_123", email: "test@example.com", role: "user" },
      secret,
      { expiresIn: "1h" },
    );

    mockCartCollection = {
      findOne: jest.fn(),
      insertOne: jest
        .fn()
        .mockResolvedValue({ acknowledged: true, insertedId: "cart_item_1" }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    };

    mockProductCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: "prod_123",
        name: "Test Product",
        price: 500000, // Giá trong DB là 500,000 VND
        stock: 100,
      }),
    };

    (cartCollection.getCollection as jest.Mock).mockResolvedValue(
      mockCartCollection,
    );
    (productCollection.getCollection as jest.Mock).mockResolvedValue(
      mockProductCollection,
    );
  });

  // ============================================================================
  // POST /api/cart/add - Quantity Boundaries
  // ============================================================================
  describe("POST /api/cart/add - Quantity Boundaries (1 - 99 Integer)", () => {
    it("TC-CART-01: [Valid Min] Thêm vào giỏ hàng với Quantity = 1 (Min) -> Accept 200", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: 1,
        });

      expect(response.status).toBe(200);
    });

    it("TC-CART-02: [Valid Max] Thêm vào giỏ hàng với Quantity = 99 (Max) -> Accept 200", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: 99,
        });

      expect(response.status).toBe(200);
    });

    it("TC-CART-03: [BVA Min- Invalid] Quantity = 0 -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: 0,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "quantity",
            message: "Quantity must be at least 1",
          }),
        ]),
      });
    });

    it("TC-CART-04: [BVA Min- Invalid] Quantity số âm (-1, -10) -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: -1,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });

    it("TC-CART-05: [BVA Max+ Invalid] Quantity = 100 -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: 100,
        });

      expect(response.status).toBe(400);
    });

    it("TC-CART-06: [EP Invalid Float] Quantity là số thập phân lẻ (1.5, 2.8) -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: 1.5,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "quantity",
            message: "Invalid input: expected int, received number",
          }),
        ]),
      });
    });

    it("TC-CART-07: [EP Invalid Type] Quantity là chuỗi chữ ('five') -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          productId: "prod_123",
          quantity: "five",
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });
  });

  // ============================================================================
  // Price Recalculation Guard & Auth Guard
  // ============================================================================
  describe("Price Recalculation Guard - Client Forged Price Rejection", () => {
    it("TC-CART-08: [Security Price Guard] Client cố tình gửi `price = 10` VND giả mạo -> Server tự truy vấn DB giá 500,000 VND để tính toán", async () => {
      const forgedPayload = {
        productId: "prod_123",
        quantity: 2,
        price: 10, // Giả mạo giá
      };

      const response = await request(app)
        .post("/api/cart/add")
        .set("Authorization", `Bearer ${validToken}`)
        .send(forgedPayload);

      expect(response.status).toBe(200);
    });

    it("TC-CART-09: [Unauthenticated] Không gửi Authorization Token -> Reject 401", async () => {
      const response = await request(app).post("/api/cart/add").send({
        productId: "prod_123",
        quantity: 1,
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        error: "UNAUTHORIZED",
      });
    });
  });
});
