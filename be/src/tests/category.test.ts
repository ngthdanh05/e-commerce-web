import { ObjectId } from "mongodb";
import {
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller";
import { categoryCollection } from "../models/category.model";

jest.mock("../models/category.model", () => ({
  categoryCollection: {
    getCollection: jest.fn(),
  },
}));

const makeMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const makeMockReq = (overrides: any = {}): any => ({
  params: {},
  body: {},
  query: {},
  ...overrides,
});

describe("Category Controller Unit Tests", () => {
  let mockCollection: any;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockCollection = {
      find: jest.fn(),
      countDocuments: jest.fn(),
      findOne: jest.fn(),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };
    (categoryCollection.getCollection as jest.Mock).mockResolvedValue(mockCollection);
  });

  describe("getAllCategories", () => {
    it("should return categories with default pagination (page=1, limit=10)", async () => {
      const catId = new ObjectId();
      const mockCategories = [
        { _id: catId, category_id: "electronics", category_name: "Electronics" },
      ];
      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockCategories),
      };
      mockCollection.find.mockReturnValue(mockFindChain);
      mockCollection.countDocuments.mockResolvedValue(15);

      const req = makeMockReq({ query: {} });
      const res = makeMockRes();

      await getAllCategories(req, res);

      expect(mockFindChain.skip).toHaveBeenCalledWith(0);
      expect(mockFindChain.limit).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith({
        categories: [
          {
            id: catId.toString(),
            category_id: "electronics",
            category_name: "Electronics",
            _id: undefined,
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 2,
          total: 15,
          limit: 10,
          hasNext: true,
          hasPrev: false,
        },
      });
    });

    it("should handle custom pagination (page=2, limit=5, hasPrev=true, hasNext=false)", async () => {
      const catId = new ObjectId();
      const mockCategories = [
        { _id: catId, category_id: "books", category_name: "Books" },
      ];
      const mockFindChain = {
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        project: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockCategories),
      };
      mockCollection.find.mockReturnValue(mockFindChain);
      mockCollection.countDocuments.mockResolvedValue(10);

      const req = makeMockReq({ query: { page: "2", limit: "5" } });
      const res = makeMockRes();

      await getAllCategories(req, res);

      expect(mockFindChain.skip).toHaveBeenCalledWith(5);
      expect(mockFindChain.limit).toHaveBeenCalledWith(5);
      expect(res.json).toHaveBeenCalledWith({
        categories: [
          {
            id: catId.toString(),
            category_id: "books",
            category_name: "Books",
            _id: undefined,
          },
        ],
        pagination: {
          currentPage: 2,
          totalPages: 2,
          total: 10,
          limit: 5,
          hasNext: false,
          hasPrev: true,
        },
      });
    });

    it("should return 500 when database throws an error", async () => {
      mockCollection.find.mockImplementation(() => {
        throw new Error("DB Error");
      });

      const req = makeMockReq();
      const res = makeMockRes();

      await getAllCategories(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe("createCategory", () => {
    it("should return 400 if category_name is missing", async () => {
      const req = makeMockReq({ body: { category_id: "cat1" } });
      const res = makeMockRes();

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_DATA" });
    });

    it("should return 400 if category_id is missing", async () => {
      const req = makeMockReq({ body: { category_name: "Category 1" } });
      const res = makeMockRes();

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_DATA" });
    });

    it("should return 400 if category already exists", async () => {
      mockCollection.findOne.mockResolvedValue({ _id: new ObjectId(), category_id: "mens-clothing" });

      const req = makeMockReq({
        body: { category_name: "Men's Clothing", category_id: "Men's Clothing" },
      });
      const res = makeMockRes();

      await createCategory(req, res);

      expect(mockCollection.findOne).toHaveBeenCalledWith({ category_id: "mens-clothing" });
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "CATEGORY_ALREADY_EXISTS" });
    });

    it("should create category successfully with formatted category_id", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockResolvedValue({ acknowledged: true });

      const req = makeMockReq({
        body: { category_name: "Women Shoes", category_id: "Women Shoes Boots" },
      });
      const res = makeMockRes();

      await createCategory(req, res);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: "women-shoes-boots",
          category_name: "Women Shoes",
        })
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            category_id: "women-shoes-boots",
            category_name: "Women Shoes",
          }),
        })
      );
    });

    it("should return 500 when database throws an error", async () => {
      mockCollection.findOne.mockRejectedValue(new Error("DB Error"));

      const req = makeMockReq({
        body: { category_name: "Test", category_id: "test" },
      });
      const res = makeMockRes();

      await createCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe("updateCategory", () => {
    it("should return 400 if id is not a valid ObjectId", async () => {
      const req = makeMockReq({ params: { id: "invalid-id" }, body: { category_id: "c1", category_name: "C1" } });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Category ID is required" });
    });

    it("should return 400 if category_id is missing", async () => {
      const validId = new ObjectId().toString();
      const req = makeMockReq({ params: { id: validId }, body: { category_name: "C1" } });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_DATA" });
    });

    it("should return 400 if category_name is missing", async () => {
      const validId = new ObjectId().toString();
      const req = makeMockReq({ params: { id: validId }, body: { category_id: "c1" } });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "INVALID_DATA" });
    });

    it("should return 500 if updateOne modifiedCount is 0", async () => {
      const validId = new ObjectId().toString();
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

      const req = makeMockReq({
        params: { id: validId },
        body: { category_id: "Electronics New", category_name: "Electronics New" },
      });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(validId) },
        expect.objectContaining({
          $set: expect.objectContaining({
            category_id: "electronics-new",
            category_name: "Electronics New",
          }),
        })
      );
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "Failed to update category" });
    });

    it("should update category successfully when modifiedCount > 0", async () => {
      const validId = new ObjectId().toString();
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const req = makeMockReq({
        params: { id: validId },
        body: { category_id: "Electronics Updated", category_name: "Electronics Updated" },
      });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("should return 500 when database throws an error", async () => {
      const validId = new ObjectId().toString();
      mockCollection.updateOne.mockRejectedValue(new Error("DB Error"));

      const req = makeMockReq({
        params: { id: validId },
        body: { category_id: "c1", category_name: "C1" },
      });
      const res = makeMockRes();

      await updateCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  describe("deleteCategory", () => {
    it("should return 400 if id is not a valid ObjectId", async () => {
      const req = makeMockReq({ params: { id: "invalid-id" } });
      const res = makeMockRes();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: "Category ID is required" });
    });

    it("should return 404 if category not found (deletedCount === 0)", async () => {
      const validId = new ObjectId().toString();
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteCategory(req, res);

      expect(mockCollection.deleteOne).toHaveBeenCalledWith({ _id: new ObjectId(validId) });
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Category not found" });
    });

    it("should delete category successfully when deletedCount > 0", async () => {
      const validId = new ObjectId().toString();
      mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteCategory(req, res);

      expect(res.json).toHaveBeenCalledWith({ success: true });
    });

    it("should return 500 when database throws an error", async () => {
      const validId = new ObjectId().toString();
      mockCollection.deleteOne.mockRejectedValue(new Error("DB Error"));

      const req = makeMockReq({ params: { id: validId } });
      const res = makeMockRes();

      await deleteCategory(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
    });
  });
});
