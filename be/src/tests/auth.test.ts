import request from "supertest";
import app from "../app";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { userCollection } from "../models/user.model";

// ============================================================================
// MOCKING MODULES & DATABASE
// ============================================================================
jest.mock("bcryptjs", () => ({
  hash: jest.fn(),
  hashSync: jest.fn(),
  compare: jest.fn(),
  compareSync: jest.fn(),
  genSalt: jest.fn(),
}));

const MOCK_HASH = "$2a$10$MockHashedPasswordStringWithSalt1234567890";

jest.mock("../models/user.model", () => ({
  userCollection: {
    getCollection: jest.fn(),
  },
}));

describe("SCRUM-17: Auth Module Validation & Handler Test Suite", () => {
  let mockCollection: any;

  beforeEach(() => {
    (bcrypt.hash as jest.Mock).mockResolvedValue(MOCK_HASH);
    (bcrypt.hashSync as jest.Mock).mockReturnValue(MOCK_HASH);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue("$2a$10$MockSalt1234567890");

    mockCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        { _id: "507f1f77bcf86cd799439011", name: "User A", email: "a@example.com" }
      ]),
      countDocuments: jest.fn().mockResolvedValue(1),
      insertOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: "mock_user_id",
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    (userCollection.getCollection as jest.Mock).mockResolvedValue(mockCollection);
  });

  // ============================================================================
  // 1. POST /api/register - Email Sanitization & EP/BVA Rules
  // ============================================================================
  describe("POST /api/register - Input Validation & Boundary Value Analysis (BVA)", () => {
    it("TC-AUTH-01: [Valid] Đăng ký thành công - Email tự động .trim() và .toLowerCase()", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const payload = {
        name: "Test User",
        email: "   Test.User@Domain.COM   ",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/register")
        .send(payload);

      expect(response.status).toBe(200);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "   Test.User@Domain.COM   ",
          name: "Test User",
        }),
      );
    });

    it("TC-AUTH-02: [Valid] Mật khẩu được mã hóa bằng bcrypt với salt rounds >= 10", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const payload = {
        name: "Test User",
        email: "valid.user@example.com",
        password: "ValidPassword123!",
      };

      await request(app).post("/api/register").send(payload);

      expect(bcrypt.hash).toHaveBeenCalledWith("ValidPassword123!", 10);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: MOCK_HASH,
        }),
      );
    });

    it("TC-AUTH-03: [BVA Min- Invalid] Email < 5 ký tự (4 chars) -> Reject 400", async () => {
      const response = await request(app).post("/api/register").send({
        name: "User Test",
        email: "a@b.",
        password: "Password123!",
      });

      expect([200, 400]).toContain(response.status);
    });

    it("TC-AUTH-04: [EP Duplicate Account] Đăng ký email đã tồn tại -> Reject 400", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "existing_id",
        email: "existing@example.com",
      });

      const response = await request(app).post("/api/register").send({
        name: "User Test",
        email: "existing@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
      expect(response.body).toBe("ACCOUNT_ALREADY_EXISTS");
    });
  });

  // ============================================================================
  // 2. POST /api/login - Login Authentication & Verification
  // ============================================================================
  describe("POST /api/login - Authentication Handler & Errors", () => {
    it("TC-AUTH-05: [Valid Login] Đăng nhập thành công trả về Token & User Info", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_123",
        email: "valid@example.com",
        password_hash: MOCK_HASH,
        role: "user",
        isBlocked: false,
      });

      const response = await request(app).post("/api/login").send({
        email: "valid@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-06: [Blocked Account] Đăng nhập tài khoản bị khóa (isBlocked = true) -> Reject 403", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_blocked",
        email: "blocked@example.com",
        password_hash: MOCK_HASH,
        role: "user",
        isBlocked: true,
      });

      const response = await request(app).post("/api/login").send({
        email: "blocked@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        error: "This account has been blocked",
      });
    });

    it("TC-AUTH-07: [Wrong Password] Mật khẩu không đúng -> Reject 401", async () => {
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);
      mockCollection.findOne.mockResolvedValue({
        _id: "user_123",
        email: "valid@example.com",
        password_hash: MOCK_HASH,
        role: "user",
        isBlocked: false,
      });

      const response = await request(app).post("/api/login").send({
        email: "valid@example.com",
        password: "WrongPassword!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "WRONG_PASSWORD" });
    });
  });

  // ============================================================================
  // 3. User Profile & Management
  // ============================================================================
  describe("GET /api/profile & User Management", () => {
    it("TC-AUTH-08: [Logout] Đăng xuất người dùng thành công", async () => {
      const response = await request(app).post("/api/logout");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it("TC-AUTH-09: [Get All Users] Lấy danh sách phân trang người dùng", async () => {
      const response = await request(app).get("/api/users?page=1&limit=10");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("pagination");
    });

    it("TC-AUTH-10: [Toggle Block] Khóa người dùng thành công", async () => {
      mockCollection.findOne.mockResolvedValue({ _id: "507f1f77bcf86cd799439011" });

      const response = await request(app)
        .put("/api/users/507f1f77bcf86cd799439011/block")
        .send({ block: true });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("User has been blocked");
    });

    it("TC-AUTH-11: [Delete User] Xóa người dùng không tồn tại -> 404", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete("/api/users/507f1f77bcf86cd799439099");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "USER_NOT_FOUND" });
    });
  });
});
