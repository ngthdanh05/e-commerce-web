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

describe("SCRUM-23: Product API Validation, Zod Sanitization & Pagination Guard Test Suite", () => {
  let mockProductCollection: any;
  let validToken: string;
  const validId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();

    const secret = process.env.JWT_SECRET || "default_secret";
    validToken = jwt.sign(
      { userId: "admin_123", email: "admin@example.com", role: "admin" },
      secret,
      { expiresIn: "1h" },
    );

    const mockCursor = {
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest
        .fn()
        .mockResolvedValue([
          { _id: validId, name: "Laptop Gaming", price: 25000000, stock: 10 },
        ]),
    };

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
      find: jest.fn().mockReturnValue(mockCursor),
      countDocuments: jest.fn().mockResolvedValue(1),
    };

    (productCollection.getCollection as jest.Mock).mockResolvedValue(
      mockProductCollection,
    );
  });

  // ============================================================================
  // POST /api/products - Price Boundaries & Sanitization
  // ============================================================================
  describe("POST /api/products - Price Boundaries & Sanitization", () => {
    it("TC-PROD-01: [Valid Min] Price = 1000 -> Accept 200", async () => {
      const payload = {
        name: "Sản phẩm min",
        price: 1000,
        category: "Test Category",
        description: "Mô tả",
        imageUrl: "http://test.com/image.png",
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.product.price).toBe(1000);
    });

    it("TC-PROD-02: [Valid Max] Price = 1,000,000,000 & Slugify Category -> Accept 200", async () => {
      const payload = {
        name: "Sản phẩm max",
        price: 1000000000,
        category: "  Đồ Gia Dụng   ", // Test sanitize
        description: "Mô tả",
        imageUrl: "http://test.com/image.png",
      };

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.product.price).toBe(1000000000);
      expect(response.body.product.category).toBe("đồ-gia-dụng"); // Zod transformed to slug
    });

    it("TC-PROD-03: [BVA Min- Invalid] Price = 999 -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm lỗi",
          price: 999,
          category: "Test",
          description: "Mô tả",
          imageUrl: "http://test.com/img.png",
        });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toContain(
        "Price must be at least 1,000 VND",
      );
    });

    it("TC-PROD-04: [EP Invalid Float] Price = 1500.5 -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm lỗi",
          price: 1500.5,
          category: "Test",
          description: "Mô tả",
          imageUrl: "http://test.com/img.png",
        });

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toContain(
        "Price must be an integer",
      );
    });

    it("TC-PROD-05: [Valid Coercion] Price là chuỗi số '5000' -> Accept 200 (Zod tự ép kiểu)", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm coercion",
          price: "5000",
          category: "Test",
          description: "Mô tả",
          imageUrl: "http://test.com/img.png",
        });

      expect(response.status).toBe(200);
      expect(response.body.product.price).toBe(5000);
    });
  });

  // ============================================================================
  // GET /api/products - Pagination (page & limit) Clamp & Default
  // ============================================================================
  describe("GET /api/products - Pagination Boundaries & Fallbacks", () => {
    it("TC-PROD-06: [Valid Query] page=2, limit=20 -> Return 200 (Giữ nguyên giá trị)", async () => {
      const response = await request(app).get("/api/products?page=2&limit=20");

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.limit).toBe(20);
    });

    it("TC-PROD-07: [BVA Page Min- Invalid] page=-5 hoặc chuỗi 'abc' -> Return 200 nhưng Default về page=1", async () => {
      const response = await request(app).get(
        "/api/products?page=-5&limit=abc",
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.pagination.limit).toBe(10); // 'abc' bị mặc định về 10
    });

    it("TC-PROD-08: [BVA Limit Max+ Invalid] limit=9999 -> Return 200 nhưng Clamp (giới hạn) về limit=100", async () => {
      const response = await request(app).get(
        "/api/products?page=1&limit=9999",
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.limit).toBe(100);
    });
  });

  // ============================================================================
  // GET /api/products/:id - Mongo ObjectId Guard
  // ============================================================================
  describe("GET /api/products/:id - Mongo ObjectId Guard", () => {
    it("TC-PROD-09: [Valid ObjectId] Format 24 hex characters -> Return 200", async () => {
      const response = await request(app)
        .get(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
    });

    it("TC-PROD-10: [Invalid ObjectId] Format ID sai ('123-abc') -> Reject 400 (Zod chặn)", async () => {
      const response = await request(app).get("/api/products/123-abc");

      expect(response.status).toBe(400);
      expect(response.body.details[0].message).toBe("INVALID_PRODUCT_ID");
    });
  });
});
