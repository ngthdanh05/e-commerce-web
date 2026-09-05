import request from "supertest";
import bcrypt from "bcryptjs";
import { userCollection } from "../models/user.model";
import {
  registerUser,
  loginUser,
  logoutUser,
} from "../controllers/user.controller";

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
const MOCK_TOKEN = "mock_admin_token";

jest.mock("../models/user.model", () => ({
  userCollection: {
    getCollection: jest.fn(),
  },
}));

// Mock đồng bộ đầy đủ verifyToken và isAdmin để tránh lỗi handler undefined
jest.mock("middleware/auth", () => ({
  verifyToken: (req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.includes("admin")) {
      req.user = { id: "admin_id", role: "admin" };
    } else {
      req.user = { id: "user_id", role: "user", email: "user@test.com" };
    }
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
}));

// Import app sau khi đã mock middleware/auth
import app from "../app";

describe("SCRUM-17: Auth Module Validation & Handler Test Suite", () => {
  let mockCollection: any;
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  // Khôi phục lại console sau khi chạy xong tất cả test cases
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    (bcrypt.hash as jest.Mock).mockResolvedValue(MOCK_HASH);
    (bcrypt.hashSync as jest.Mock).mockReturnValue(MOCK_HASH);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.compareSync as jest.Mock).mockReturnValue(true);
    (bcrypt.genSalt as jest.Mock).mockResolvedValue(
      "$2a$10$MockSalt1234567890",
    );

    mockCollection = {
      findOne: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([
        {
          _id: "507f1f77bcf86cd799439011",
          name: "User A",
          email: "a@example.com",
        },
      ]),
      countDocuments: jest.fn().mockResolvedValue(1),
      insertOne: jest.fn().mockResolvedValue({
        acknowledged: true,
        insertedId: "mock_user_id",
      }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    };

    (userCollection.getCollection as jest.Mock).mockResolvedValue(
      mockCollection,
    );
  });

  // ============================================================================
  // 1. POST /api/auth/register - Input Validation & BVA
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

      expect(response.status).toBe(200);
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

      expect(bcrypt.hash).toHaveBeenCalledWith("ValidPassword123!", 10);
      expect(mockCollection.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          password_hash: MOCK_HASH,
        }),
      );
    });

    it("TC-AUTH-03: [BVA Min- Invalid] Email < 5 ký tự (4 chars) -> Reject 400", async () => {
      const response = await request(app).post("/api/auth/register").send({
        name: "User Test",
        email: "a@b.",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
    });

    it("TC-AUTH-04: [EP Duplicate Account] Đăng ký email đã tồn tại -> Reject 400", async () => {
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
      expect(response.body).toEqual({ error: "ACCOUNT_ALREADY_EXISTS" });
    });

    it("TC-AUTH-NEW-01: [DB Error 500] Register khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "valid@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });

    it("TC-AUTH-NEW-02: [DB Error 500] Register khi insertOne throw exception", async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockRejectedValue(new Error("Write failed"));

      const response = await request(app).post("/api/auth/register").send({
        name: "Test User",
        email: "valid@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  // ============================================================================
  // 2. POST /api/auth/login - Authentication Handler & Errors
  // ============================================================================
  describe("POST /api/auth/login - Authentication Handler & Errors", () => {
    it("TC-AUTH-05: [Valid Login] Đăng nhập thành công trả về Token & User Info", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_123",
        email: "valid@example.com",
        password_hash: MOCK_HASH,
        role: "user",
        isBlocked: false,
      });

      const response = await request(app).post("/api/auth/login").send({
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

      const response = await request(app).post("/api/auth/login").send({
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

      const response = await request(app).post("/api/auth/login").send({
        email: "valid@example.com",
        password: "WrongPassword!",
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ error: "WRONG_PASSWORD" });
    });

    it("TC-AUTH-NEW-03: [Account Not Found] Đăng nhập email không tồn tại -> 404", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app).post("/api/auth/login").send({
        email: "notexist@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "ACCOUNT_NOT_FOUND" });
    });

    it("TC-AUTH-NEW-04: [DB Error 500] Login khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app).post("/api/auth/login").send({
        email: "valid@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  // ============================================================================
  // 3. Admin User Management Routes (/api/admin/users) & Logout
  // ============================================================================
  describe("Admin User Management & Logout", () => {
    it("TC-AUTH-08: [Logout] Đăng xuất người dùng thành công", async () => {
      const response = await request(app).post("/api/auth/logout");
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it("TC-AUTH-09: [Get All Users] Lấy danh sách phân trang người dùng", async () => {
      const response = await request(app)
        .get("/api/admin/users?page=1&limit=10")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("users");
      expect(response.body).toHaveProperty("pagination");
    });

    it("TC-AUTH-10: [Toggle Block] Khóa người dùng thành công", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
      });

      const response = await request(app)
        .put("/api/admin/users/507f1f77bcf86cd799439011/block")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`)
        .send({ isBlocked: true, block: true });

      expect(response.status).toBe(200);
    });

    it("TC-AUTH-11: [Delete User] Xóa người dùng không tồn tại -> 404", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .delete("/api/admin/users/507f1f77bcf86cd799439099")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(404);
    });
  });

  // ============================================================================
  // 4. GET /api/profile - Profile handler (previously 0% coverage)
  // ============================================================================
  describe("GET /api/profile - Profile Handler", () => {
    it("TC-AUTH-NEW-07: [Valid Profile] Lấy profile người dùng thành công", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "user_123",
        name: "Test User",
        email: "user@test.com",
        role: "user",
      });

      const response = await request(app)
        .get("/api/profile")
        .set("Authorization", "Bearer user_token");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: expect.objectContaining({ email: "user@test.com" }),
      });
    });

    it("TC-AUTH-NEW-08: [Profile Not Found] User không tồn tại trong DB -> 404", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .get("/api/profile")
        .set("Authorization", "Bearer user_token");

      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        success: false,
        message: "USER_NOT_FOUND",
      });
    });

    it("TC-AUTH-NEW-09: [DB Error 500] Profile khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app)
        .get("/api/profile")
        .set("Authorization", "Bearer user_token");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        message: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  // ============================================================================
  // 5. GET /api/admin/users - getAllUsers edge cases
  // ============================================================================
  describe("GET /api/admin/users - getAllUsers Edge Cases", () => {
    it("TC-AUTH-NEW-10: [Pagination Fallback] page & limit là chuỗi không hợp lệ -> dùng default 1/10", async () => {
      const response = await request(app)
        .get("/api/admin/users?page=abc&limit=xyz")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.pagination).toMatchObject({
        currentPage: 1,
        limit: 10,
      });
    });

    it("TC-AUTH-NEW-11: [DB Error 500] getAllUsers khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  // ============================================================================
  // 6. PUT /api/admin/users/:id/block - toggleBlockUser edge cases
  // ============================================================================
  describe("PUT /api/admin/users/:id/block - toggleBlockUser Edge Cases", () => {
    it("TC-AUTH-NEW-12: [User Not Found] Toggle block user không tồn tại -> 404", async () => {
      mockCollection.findOne.mockResolvedValue(null);

      const response = await request(app)
        .put("/api/admin/users/507f1f77bcf86cd799439011/block")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`)
        .send({ block: true });

      expect(response.status).toBe(404);
      expect(response.body).toEqual({ error: "USER_NOT_FOUND" });
    });

    it("TC-AUTH-NEW-13: [Unblock User] Mở khóa user thành công -> message 'unblocked'", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        isBlocked: true,
      });

      const response = await request(app)
        .put("/api/admin/users/507f1f77bcf86cd799439011/block")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`)
        .send({ block: false });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        message: "User has been unblocked",
      });
    });

    it("TC-AUTH-NEW-14: [DB Error 500] toggleBlockUser khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app)
        .put("/api/admin/users/507f1f77bcf86cd799439011/block")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`)
        .send({ block: true });

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });
  });

  // ============================================================================
  // 7. DELETE /api/admin/users/:id - deleteUser edge cases
  // ============================================================================
  describe("DELETE /api/admin/users/:id - deleteUser Edge Cases", () => {
    it("TC-AUTH-NEW-15: [Delete Success] Xóa user tồn tại thành công -> 200", async () => {
      mockCollection.findOne.mockResolvedValue({
        _id: "507f1f77bcf86cd799439011",
        name: "User To Delete",
        email: "delete@example.com",
      });

      const response = await request(app)
        .delete("/api/admin/users/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: "User deleted successfully",
      });
      expect(mockCollection.deleteOne).toHaveBeenCalledTimes(1);
    });

    it("TC-AUTH-NEW-16: [DB Error 500] deleteUser khi getCollection throw exception", async () => {
      (userCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("DB connection failed"),
      );

      const response = await request(app)
        .delete("/api/admin/users/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${MOCK_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.body).toEqual({ error: "INTERNAL_SERVER_ERROR" });
    });
  });
});

// ============================================================================
// 8. Uncovered Lines (L16, L47, L93-94) - Guard Clauses & Exception Catching
// ============================================================================
describe("Coverage Completion - Uncovered Lines (L16, L47, L93-94)", () => {
  it("TC-AUTH-BYPASS-01: [Direct Unit Test] Trigger Guard Clauses L16 & L47 khi gọi trực tiếp Controller thiếu body fields", async () => {
    const reqMissing = { body: {} } as any;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    // Gọi trực tiếp register handler với body rỗng để trigger if (!name || !email || !password) -> L16
    await registerUser(reqMissing, res);
    expect(res.status).toHaveBeenCalledWith(400);

    res.status.mockClear();

    // Gọi trực tiếp login handler với body rỗng để trigger if (!email || !password) -> L47
    await loginUser(reqMissing, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("TC-AUTH-LOGOUT-ERR-01: [Logout 500] Trigger catch block L93-94 khi logout gặp sự cố", async () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    const req = {} as any;
    const res = {
      clearCookie: jest.fn().mockImplementationOnce(() => {
        throw new Error("Clear Cookie Error");
      }),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as any;

    await logoutUser(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Logout failed" });
  });
});
