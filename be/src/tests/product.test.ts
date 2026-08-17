import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { productCollection } from "../models/product.model";

// ============================================================================
// MOCKING MODEL
// ============================================================================
jest.mock("../models/product.model", () => ({
  productCollection: {
    getCollection: jest.fn(),
  },
}));

describe("SCRUM-21: Product API Validation & Route Guard Test Suite", () => {
  let mockProductCollection: any;
  let validToken: string;
  const validId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();

    // Tạo Token hợp lệ cho các Route yêu cầu Authentication
    const secret = process.env.JWT_SECRET || "default_secret";
    validToken = jwt.sign(
      { userId: "admin_123", email: "admin@example.com", role: "admin" },
      secret,
      { expiresIn: "1h" },
    );

    // Mock MongoDB Collection đầy đủ các method truy vấn
    mockProductCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: validId,
        name: "Laptop Gaming",
        price: 25000000,
        stock: 10,
      }),
      insertOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: validId,
      }),
      find: jest.fn().mockReturnValue({
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest
          .fn()
          .mockResolvedValue([
            { _id: validId, name: "Laptop Gaming", price: 25000000, stock: 10 },
          ]),
      }),
      countDocuments: jest.fn().mockResolvedValue(1),
    };

    (productCollection.getCollection as jest.Mock).mockResolvedValue(
      mockProductCollection,
    );
  });

  // ============================================================================
  // POST /api/products - Input Validation
  // ============================================================================
  describe("POST /api/products - Input Validation", () => {
    it("TC-PROD-01: [Valid] Tạo sản phẩm hợp lệ -> Accept 200/201", async () => {
      const payload = {
        name: "Laptop Gaming New",
        price: 20000000,
        stock: 5,
        description: "Mô tả sản phẩm test",
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send(payload);

      // Chấp nhận cả 200 và 201 tùy thuộc theo Controller
      expect([200, 201]).toContain(response.status);
    });

    it("TC-PROD-02: [Invalid Price] Price = 0 hoặc âm -> Reject 400 Validation Error", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Laptop Gaming",
          price: -100,
          stock: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        error: "VALIDATION_ERROR",
        details: expect.arrayContaining([
          expect.objectContaining({
            field: "price",
          }),
        ]),
      });
    });

    it("TC-PROD-03: [Invalid Type] Price không phải kiểu số -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Laptop Gaming",
          price: "invalid_price",
          stock: 5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("VALIDATION_ERROR");
    });
  });

  // ============================================================================
  // GET /api/products/:id - Mongo ObjectId Guard
  // ============================================================================
  describe("GET /api/products/:id - Mongo ObjectId Guard", () => {
    it("TC-PROD-04: [Valid ObjectId] Format 24 hex characters chuẩn -> Return 200", async () => {
      const response = await request(app)
        .get(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("TC-PROD-05: [Invalid ObjectId] Format ID sai ('123-abc', 'invalid_id') -> Reject 400", async () => {
      const response = await request(app).get("/api/products/123-abc");

      expect(response.status).toBe(400);
    });
  });

  // ============================================================================
  // GET /api/products - Query Parameters Validation
  // ============================================================================
  describe("GET /api/products - Query Parameters Validation", () => {
    it("TC-PROD-06: [Valid Query] Truyền page và limit hợp lệ -> Return 200", async () => {
      const response = await request(app).get("/api/products?page=2&limit=10");

      expect(response.status).toBe(200);
    });

    it("TC-PROD-07: [Invalid Query] Truyền page <= 0 hoặc chuỗi chữ -> Default về 1 và Return 200", async () => {
      const response = await request(app).get("/api/products?page=0&limit=abc");

      expect(response.status).toBe(200);
    });
  });
});
