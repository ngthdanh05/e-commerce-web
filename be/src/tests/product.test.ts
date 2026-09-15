import request from "supertest";
import app from "../app";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { productCollection } from "../models/product.model";
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller";

// ============================================================================
// MOCKING MODEL
// ============================================================================
jest.mock("../models/product.model", () => ({
  productCollection: {
    getCollection: jest.fn(),
  },
}));

// Mock cloudinary via the module alias path that the controller uses
// NOTE: jest.mock() is hoisted, so we cannot reference variables defined in module scope.
// We use jest.fn() directly in the factory and access the reference via jest.requireMock()
// __esModule: true is required so ts-jest treats the 'default' property as the ES default export.
jest.mock("config/cloudinary", () => ({
  __esModule: true,
  default: {
    uploader: {
      destroy: jest.fn(),
    },
  },
}));

// Reference to the mocked destroy function - accessed after mock is registered
const cloudinaryMock = {
  get destroy() {
    return jest.requireMock("config/cloudinary").default.uploader.destroy as jest.Mock;
  },
};


// ============================================================================
// HELPERS - tạo mock req/res để test controller trực tiếp
// ============================================================================
const makeMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = { validatedQuery: { page: 1, limit: 10 } };
  return res;
};

const makeMockReq = (overrides: any = {}): any => ({
  params: {},
  body: {},
  query: {},
  user: { userId: "admin_123", email: "admin@example.com", role: "admin" },
  ...overrides,
});

describe("SCRUM-23: Product API Validation, Zod Sanitization & Pagination Guard Test Suite", () => {
  let mockProductCollection: any;
  let validToken: string;
  const validId = "507f1f77bcf86cd799439011";

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset cloudinary destroy to resolve successfully for each test
    cloudinaryMock.destroy.mockResolvedValue({ result: "ok" });

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
          { _id: { toString: () => validId }, name: "Laptop Gaming", price: 25000000, stock: 10 },
        ]),
    };

    mockProductCollection = {
      findOne: jest.fn().mockResolvedValue({
        _id: validId,
        name: "Laptop Gaming",
        price: 25000000,
        stock: 10,
        public_id: "",
      }),
      insertOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: validId,
      }),
      updateOne: jest.fn().mockResolvedValue({
        matchedCount: 1,
        modifiedCount: 1,
        acknowledged: true,
      }),
      deleteOne: jest.fn().mockResolvedValue({
        deletedCount: 1,
        acknowledged: true,
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

    it("TC-PROD-BVA-MAX-INVALID: [BVA Max+1 Invalid] Price = 1,000,000,001 -> Reject 400", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm quá max",
          price: 1000000001,
          category: "Test",
          description: "Mô tả",
          imageUrl: "http://test.com/img.png",
        });

      expect(response.status).toBe(400);
    });

    it("TC-PROD-PRICE-MID: [Valid Mid] Price = 25,000,000 -> Accept 200", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Laptop Gaming",
          price: 25000000,
          category: "Electronics",
          description: "High-end gaming laptop",
          imageUrl: "http://test.com/laptop.png",
        });

      expect(response.status).toBe(200);
    });

    it("TC-PROD-NO-TOKEN: POST without token -> Reject 401", async () => {
      const response = await request(app)
        .post("/api/products")
        .send({
          name: "Sản phẩm",
          price: 5000,
          category: "Test",
          description: "Mô tả",
        });

      expect(response.status).toBe(401);
    });

    it("TC-PROD-CREATE-NOT-ACKNOWLEDGED: insertOne not acknowledged -> 500", async () => {
      mockProductCollection.insertOne.mockResolvedValue({ acknowledged: false });

      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm lỗi db",
          price: 5000,
          category: "Test",
          description: "Mô tả",
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Failed to add product");
    });

    it("TC-PROD-CREATE-NO-IMAGE: Product without imageUrl uses empty string", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm không ảnh",
          price: 5000,
          category: "Test",
          description: "Mô tả",
          // No imageUrl
        });

      expect(response.status).toBe(200);
      expect(response.body.product.imageUrl).toBe("");
    });

    it("TC-PROD-CREATE-NO-CATEGORY: Product without category defaults to uncategorized", async () => {
      const response = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          name: "Sản phẩm không category",
          price: 5000,
          description: "Mô tả",
          // No category
        });

      expect(response.status).toBe(200);
      expect(response.body.product.category).toBe("uncategorized");
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

    it("TC-PROD-GET-ALL-EMPTY: Empty product list -> Return 200 với products = []", async () => {
      const emptyMockCursor = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockProductCollection.find.mockReturnValue(emptyMockCursor);
      mockProductCollection.countDocuments.mockResolvedValue(0);

      const response = await request(app).get("/api/products");

      expect(response.status).toBe(200);
      expect(response.body.products).toHaveLength(0);
      expect(response.body.pagination.total).toBe(0);
    });

    it("TC-PROD-GET-ALL-PAGINATION-META: Verify hasNext=true, hasPrev=true when on middle page", async () => {
      const mockCursor2 = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([
          { _id: { toString: () => validId }, name: "Product", price: 5000 },
        ]),
      };
      mockProductCollection.find.mockReturnValue(mockCursor2);
      mockProductCollection.countDocuments.mockResolvedValue(30);

      const response = await request(app).get("/api/products?page=2&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasNext).toBe(true);
      expect(response.body.pagination.hasPrev).toBe(true);
      expect(response.body.pagination.totalPages).toBe(3);
    });

    it("TC-PROD-GET-ALL-FIRST-PAGE: page=1 -> hasPrev=false", async () => {
      mockProductCollection.countDocuments.mockResolvedValue(20);

      const response = await request(app).get("/api/products?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasPrev).toBe(false);
    });

    it("TC-PROD-GET-ALL-LAST-PAGE: last page -> hasNext=false", async () => {
      mockProductCollection.countDocuments.mockResolvedValue(10);

      const response = await request(app).get("/api/products?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.pagination.hasNext).toBe(false);
    });

    it("TC-PROD-GET-ALL-DB-ERROR: DB throws error -> Return 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB connection error"),
      );

      const response = await request(app).get("/api/products");

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
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

    it("TC-PROD-07: [Invalid Query] Truyền page <= 0 hoặc chuỗi chữ -> Default về 1 và Return 200", async () => {
      const response = await request(app).get("/api/products?page=0&limit=abc");

      expect(response.status).toBe(200);
    });

    it("TC-PROD-GET-BY-ID-INVALID-OBJECTID: Invalid ObjectId format -> Zod middleware -> 400", async () => {
      const response = await request(app)
        .get("/api/products/invalid-id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it("TC-PROD-GET-BY-ID-NOT-FOUND: Valid ObjectId but product not in DB -> 404", async () => {
      mockProductCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Product not found");
    });

    it("TC-PROD-GET-BY-ID-DB-ERROR: DB throws error -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB error"),
      );

      const response = await request(app)
        .get(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    });
  });

  // ============================================================================
  // Controller direct tests - để cover các guard branches không thể đến qua HTTP
  // ============================================================================
  describe("Controller direct tests - Guard branches", () => {
    // getProductById - line 69-72: !ObjectId.isValid(id) guard trong controller
    it("TC-CTRL-GET-BY-ID-INVALID-OID: Controller getProductById với invalid ObjectId -> 400", async () => {
      const req = makeMockReq({ params: { id: "not-a-valid-objectid" } });
      const res = makeMockRes();

      await getProductById(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_PRODUCT_ID" });
    });

    // createProduct - line 105-109: !user guard
    it("TC-CTRL-CREATE-NO-USER: Controller createProduct without user -> 401", async () => {
      const req = makeMockReq({ user: undefined });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Please login to continue",
      });
    });

    // createProduct - line 114-115: missing required fields guard (name missing)
    it("TC-CTRL-CREATE-MISSING-NAME: Controller createProduct without name -> 400", async () => {
      const req = makeMockReq({
        body: { price: 5000, description: "Test", category: "Test" },
      });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Data are required" });
    });

    // createProduct - line 114-115: missing price
    it("TC-CTRL-CREATE-MISSING-PRICE: Controller createProduct without price -> 400", async () => {
      const req = makeMockReq({
        body: { name: "Test", description: "Test", category: "Test" },
      });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Data are required" });
    });

    // createProduct - line 114-115: missing description
    it("TC-CTRL-CREATE-MISSING-DESC: Controller createProduct without description -> 400", async () => {
      const req = makeMockReq({
        body: { name: "Test", price: 5000, category: "Test" },
      });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Data are required" });
    });

    // createProduct - DB throws error
    it("TC-CTRL-CREATE-DB-ERROR: Controller createProduct DB throws -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const req = makeMockReq({
        body: {
          name: "Test Product",
          price: 5000,
          description: "Test",
          category: "Test",
        },
      });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });

    // createProduct - no category (branch: category falsy -> "uncategorized")
    it("TC-CTRL-CREATE-NO-CATEGORY: Controller createProduct without category -> uses uncategorized", async () => {
      const req = makeMockReq({
        body: {
          name: "Test Product",
          price: 5000,
          description: "Test",
          // no category
        },
      });
      const res = makeMockRes();

      await createProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    // getAllProducts - DB throws error (direct controller call)
    it("TC-CTRL-GET-ALL-DB-ERROR: Controller getAllProducts DB throws -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const req = makeMockReq({ query: {} });
      const res = makeMockRes();
      res.locals = { validatedQuery: { page: 1, limit: 10 } };

      await getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });

    // getAllProducts - cursor without sort/skip/limit/project (cover if-branches at lines 16/20/24/28)
    it("TC-CTRL-GET-ALL-NO-CURSOR-METHODS: Cursor without optional methods -> still works", async () => {
      const simpleCursor = {
        // No sort, skip, limit, project methods — covers the typeof === 'function' false branches
        toArray: jest.fn().mockResolvedValue([]),
      };
      mockProductCollection.find.mockReturnValue(simpleCursor);
      mockProductCollection.countDocuments.mockResolvedValue(0);

      const req = makeMockReq({});
      const res = makeMockRes();
      res.locals = { validatedQuery: { page: 1, limit: 10 } };

      await getAllProducts(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================================
  // PUT /api/products/:id - updateProduct
  // ============================================================================
  describe("PUT /api/products/:id - updateProduct", () => {
    const updatePayload = {
      name: "Updated Product",
      price: 10000,
      description: "Updated description",
      category: "Updated Category",
      imageUrl: "http://test.com/updated.png",
      public_id: "some_public_id",
    };

    it("TC-PROD-UPDATE-SUCCESS: Valid update -> 200", async () => {
      const response = await request(app)
        .put(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updatePayload);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC-PROD-UPDATE-NOT-FOUND: Product not found -> 404", async () => {
      mockProductCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
      });

      const response = await request(app)
        .put(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updatePayload);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("Product not found");
    });

    it("TC-PROD-UPDATE-INVALID-OID: Invalid ObjectId -> middleware 400", async () => {
      const response = await request(app)
        .put("/api/products/not-valid-id")
        .set("Authorization", `Bearer ${validToken}`)
        .send(updatePayload);

      expect(response.status).toBe(400);
    });

    it("TC-PROD-UPDATE-NO-TOKEN: Update without auth -> 401", async () => {
      const response = await request(app)
        .put(`/api/products/${validId}`)
        .send(updatePayload);

      expect(response.status).toBe(401);
    });

    it("TC-PROD-UPDATE-DB-ERROR: DB throws on updateOne -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const response = await request(app)
        .put(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`)
        .send(updatePayload);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("INTERNAL_SERVER_ERROR");
    });

    // Direct controller tests for guard branches in updateProduct
    it("TC-CTRL-UPDATE-INVALID-OID: Controller updateProduct with invalid ObjectId -> 400", async () => {
      const req = makeMockReq({
        params: { id: "not-a-valid-objectid" },
        body: updatePayload,
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_PRODUCT_ID" });
    });

    it("TC-CTRL-UPDATE-MISSING-FIELDS: Controller updateProduct missing name/price/description -> 400", async () => {
      const req = makeMockReq({
        params: { id: validId },
        body: { category: "Test" }, // missing name, price, description
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Data are required" });
    });

    it("TC-CTRL-UPDATE-NO-CATEGORY: Controller updateProduct without category uses 'uncategorized'", async () => {
      const req = makeMockReq({
        params: { id: validId },
        body: {
          name: "Updated",
          price: 5000,
          description: "Updated desc",
          // no category -> categoryStr = "uncategorized"
        },
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("TC-CTRL-UPDATE-DB-ERROR: Controller updateProduct DB throws -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const req = makeMockReq({
        params: { id: validId },
        body: updatePayload,
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });

    it("TC-CTRL-UPDATE-NOT-FOUND: Controller updateProduct product not found -> 404", async () => {
      mockProductCollection.updateOne.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
        acknowledged: true,
      });

      const req = makeMockReq({
        params: { id: validId },
        body: updatePayload,
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Product not found" });
    });

    // Line 191 - the second !ObjectId.isValid(id) check in updateProduct is dead code
    // (same id is checked twice). Cover it by spying on ObjectId.isValid to return
    // true first (passes line 176 check) and false second (triggers line 191 branch).
    it("TC-CTRL-UPDATE-SECOND-OID-CHECK: Second ObjectId.isValid check at line 191 -> 400 Invalid product ID", async () => {
      // Make ObjectId.isValid return true on first call, false on second call
      const isValidSpy = jest
        .spyOn(ObjectId, "isValid")
        .mockReturnValueOnce(true)  // passes the first check at line 176
        .mockReturnValueOnce(false); // triggers the second check at line 191

      const req = makeMockReq({
        params: { id: validId },
        body: {
          name: "Updated Product",
          price: 5000,
          description: "Updated desc",
          category: "Test",
        },
      });
      const res = makeMockRes();

      await updateProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Invalid product ID" });
      isValidSpy.mockRestore();
    });
  });

  // ============================================================================
  // DELETE /api/products/:id - deleteProduct
  // ============================================================================
  describe("DELETE /api/products/:id - deleteProduct", () => {
    it("TC-PROD-DELETE-SUCCESS: Valid delete (no public_id) -> 200", async () => {
      mockProductCollection.findOne.mockResolvedValue({
        _id: validId,
        name: "Laptop Gaming",
        price: 25000000,
        public_id: "", // falsy -> cloudinary NOT called
      });

      const response = await request(app)
        .delete(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC-PROD-DELETE-WITH-CLOUDINARY: Product with public_id -> destroy called -> 200", async () => {
      mockProductCollection.findOne.mockResolvedValue({
        _id: validId,
        name: "Product with image",
        price: 5000,
        public_id: "cloudinary_public_id_123",
      });

      const response = await request(app)
        .delete(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it("TC-PROD-DELETE-NOT-FOUND: Product not found -> 404", async () => {
      mockProductCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toBe("PRODUCT_NOT_FOUND");
    });

    it("TC-PROD-DELETE-INVALID-OID: Invalid ObjectId -> middleware 400", async () => {
      const response = await request(app)
        .delete("/api/products/bad-id")
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(400);
    });

    it("TC-PROD-DELETE-NO-TOKEN: Delete without auth -> 401", async () => {
      const response = await request(app).delete(`/api/products/${validId}`);

      expect(response.status).toBe(401);
    });

    it("TC-PROD-DELETE-DB-ERROR: DB throws on getCollection -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const response = await request(app)
        .delete(`/api/products/${validId}`)
        .set("Authorization", `Bearer ${validToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe("Internal server error");
    });

    // Direct controller tests for guard branches
    it("TC-CTRL-DELETE-INVALID-OID: Controller deleteProduct with invalid ObjectId -> 400", async () => {
      const req = makeMockReq({ params: { id: "not-a-valid-objectid" } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_PRODUCT_ID" });
    });

    it("TC-CTRL-DELETE-NO-ID: Controller deleteProduct with empty id -> 400", async () => {
      const req = makeMockReq({ params: { id: "" } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_PRODUCT_ID" });
    });

    it("TC-CTRL-DELETE-NOT-FOUND: Controller deleteProduct product not found -> 404", async () => {
      mockProductCollection.findOne.mockResolvedValue(null);

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "PRODUCT_NOT_FOUND" });
    });

    it("TC-CTRL-DELETE-WITH-PUBLIC-ID: Controller deleteProduct with public_id -> cloudinary.destroy called", async () => {
      mockProductCollection.findOne.mockResolvedValue({
        _id: validId,
        public_id: "some_public_id",
      });

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(cloudinaryMock.destroy).toHaveBeenCalledWith("some_public_id");
    });

    it("TC-CTRL-DELETE-WITHOUT-PUBLIC-ID: Controller deleteProduct without public_id -> destroy NOT called", async () => {
      mockProductCollection.findOne.mockResolvedValue({
        _id: validId,
        public_id: "", // falsy
      });

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(cloudinaryMock.destroy).not.toHaveBeenCalled();
    });

    it("TC-CTRL-DELETE-DB-ERROR: Controller deleteProduct DB throws -> 500", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValueOnce(
        new Error("DB Error"),
      );

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteProduct(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Internal server error",
      });
    });
  });
});
