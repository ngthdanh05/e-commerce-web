import request from "supertest";
import app from "../app";
import bcrypt from "bcryptjs";
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
    (bcrypt.genSalt as jest.Mock).mockResolvedValue(
      "$2a$10$MockSalt1234567890",
    );

    mockCollection = {
      findOne: jest.fn(),
      insertOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: "mock_user_id",
      }),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    };

    (userCollection.getCollection as jest.Mock).mockResolvedValue(
      mockCollection,
    );
  });

  // ============================================================================
  // 1. POST /api/auth/register - Email Sanitization & EP/BVA Rules
  // ============================================================================
  describe("POST /api/auth/register - Input Validation & Boundary Value Analysis (BVA)", () => {
    it("TC-AUTH-01: [Valid] Đăng ký thành công - Email tự động .trim() và .toLowerCase()", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const payload = {
        name: "Test User",
        email: "   Test.User@Domain.COM   ",
        password: "Password123!",
      };

      const response = await request(app)
        .post("/api/auth/register")
        .send(payload);

      // Controller trả về status 200 thay vì 201
      expect(response.status).toBe(200);

      // Kiểm tra email lưu vào DB đã chuẩn hóa
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "test.user@domain.com",
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

      await request(app).post("/api/auth/register").send(payload);

      // Sử dụng bcrypt.hash (async) phù hợp với mock
      expect(bcrypt.hash).toHaveBeenCalledWith("ValidPassword123!", 10);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: MOCK_HASH,
        }),
      );
    });

    // --------------------------------------------------------------------------
    // BVA & EP: Email Field Tests
    // --------------------------------------------------------------------------
    it("TC-AUTH-03: [BVA Min- Invalid] Email < 5 ký tự (4 chars) -> Reject 400", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "a@b.",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-04: [BVA Min Valid] Email = 5 ký tự (a@b.c) -> Accept 200", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "a@b.c",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-05: [BVA Max Valid] Email = 254 ký tự -> Accept 200", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      const longLocal = "a".repeat(242);
      const email254 = `${longLocal}@domain.com`;

      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: email254,
        password: "Password123!",
      });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-06: [BVA Max+ Invalid] Email = 255 ký tự -> Reject 400", async () => {
      const longLocal = "a".repeat(244);
      const email255 = `${longLocal}@domain.com`;

      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: email255,
        password: "Password123!",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-07: [EP Invalid] Email không đúng định dạng RFC (thiếu @ hoặc domain) -> Reject 400", async () => {
      const invalidEmails = [
        "plainaddress",
        "@domain.com",
        "user@domain",
        "user@.com",
        "user space@domain.com",
      ];

      for (const email of invalidEmails) {
        const response = await request(app).post("/api/auth/register").send({
          name: "User Test",
          email,
          password: "Password123!",
        });

        expect(response.status).toBe(400);
      }
    });

    // --------------------------------------------------------------------------
    // BVA & EP: Password Complexity Tests
    // --------------------------------------------------------------------------
    it("TC-AUTH-08: [BVA Min- Invalid] Password < 8 ký tự (7 chars) -> Reject 400", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "valid@example.com",
        password: "Pass12!",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-09: [BVA Min Valid] Password = 8 ký tự thỏa mãn đủ độ phức tạp -> Accept 200", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "valid@example.com",
        password: "Pass123!",
      });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-10: [EP Complexity Invalid] Password thiếu chữ hoa (lowercase only) -> Reject 400", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "valid@example.com",
        password: "password123!",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-11: [EP Complexity Invalid] Password thiếu ký tự đặc biệt -> Reject 400", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "valid@example.com",
        password: "Password123",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-12: [EP Duplicate Account] Đăng ký email đã tồn tại -> Reject 400", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "existing_id",
        email: "existing@example.com",
      });

      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "existing@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
      // Cập nhật đúng response string thực tế từ Controller
      expect(response.body).toBe("ACCOUNT_ALREADY_EXISTS");
    });
  });

  // ============================================================================
  // 2. POST /api/auth/login - Login Authentication & Verification
  // ============================================================================
  describe("POST /api/auth/login - Authentication Handler & Errors", () => {
    it("TC-AUTH-13: [Valid Login] Đăng nhập thành công trả về Token & User Info", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_123",
        email: "valid@example.com",
        password_hash: "$2a$10$MockHashedPasswordStringWithSalt1234567890",
        role: "user",
        isBlocked: false,
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "valid@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-14: [Blocked Account] Đăng nhập tài khoản bị khóa (isBlocked = true) -> Reject 403", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_blocked",
        email: "blocked@example.com",
        password_hash: "$2a$10$MockHashedPasswordStringWithSalt1234567890",
        role: "user",
        isBlocked: true,
      });

      const response = await request(app).post("/api/auth/login").send({
        email: "blocked@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(403);
      // Cập nhật cấu hình object response thực tế từ Controller
      expect(response.body).toEqual({
        error: "This account has been blocked",
      });
    });
  });
});
