import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { z, ZodError } from "zod";
import { verifyToken, isAdmin, AuthRequest } from "../middleware/auth";
import { validate } from "../middleware/validate";

const makeMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.locals = {};
  return res;
};

describe("Middleware Unit Tests", () => {
  describe("Auth Middleware (src/middleware/auth.ts)", () => {
    const originalEnv = process.env.JWT_SECRET;

    beforeAll(() => {
      process.env.JWT_SECRET = "test_secret_key_12345";
    });

    afterAll(() => {
      process.env.JWT_SECRET = originalEnv;
    });

    describe("verifyToken", () => {
      it("should authenticate via cookie session_token", () => {
        const userId = new ObjectId();
        const token = jwt.sign(
          { _id: userId.toHexString(), email: "cookie@user.com", role: "user" },
          process.env.JWT_SECRET!
        );

        const req: any = {
          cookies: { session_token: token },
          headers: {},
        };
        const res = makeMockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toBeDefined();
        expect(req.user?.email).toBe("cookie@user.com");
        expect(req.user?._id).toEqual(userId);
        expect(req.user?.role).toBe("user");
      });

      it("should authenticate via Authorization Bearer header when cookie is missing", () => {
        const userId = new ObjectId();
        const token = jwt.sign(
          { _id: userId.toHexString(), email: "header@admin.com", role: "admin" },
          process.env.JWT_SECRET!
        );

        const req: any = {
          cookies: {},
          headers: { authorization: `Bearer ${token}` },
        };
        const res = makeMockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user?.role).toBe("admin");
      });

      it("should return 401 UNAUTHORIZED when no token is provided in cookie or header", () => {
        const req: any = {
          cookies: {},
          headers: {},
        };
        const res = makeMockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: "UNAUTHORIZED" });
      });

      it("should return 403 INVALID_TOKEN when token verification fails", () => {
        const req: any = {
          cookies: { session_token: "invalid-or-malformed-token" },
          headers: {},
        };
        const res = makeMockRes();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({ error: "INVALID_TOKEN" });
      });
    });

    describe("isAdmin", () => {
      it("should allow request to proceed if user role is admin", () => {
        const req: any = {
          user: { _id: new ObjectId(), email: "admin@test.com", role: "admin" },
        };
        const res = makeMockRes();
        const next = jest.fn();

        isAdmin(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });

      it("should return 403 FORBIDDEN_ADMIN_ONLY if user role is user", () => {
        const req: any = {
          user: { _id: new ObjectId(), email: "user@test.com", role: "user" },
        };
        const res = makeMockRes();
        const next = jest.fn();

        isAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith({
          success: false,
          errors: [{ message: "FORBIDDEN_ADMIN_ONLY" }],
        });
      });

      it("should return 403 FORBIDDEN_ADMIN_ONLY if user is undefined", () => {
        const req: any = {};
        const res = makeMockRes();
        const next = jest.fn();

        isAdmin(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(403);
      });
    });
  });

  describe("Validate Middleware (src/middleware/validate.ts)", () => {
    it("should validate and parse body, params, and query successfully", () => {
      const middleware = validate({
        body: z.object({ name: z.string() }),
        params: z.object({ id: z.string() }),
        query: z.object({ page: z.string() }),
      });

      const req: any = {
        body: { name: "Product A", extraField: 123 },
        params: { id: "10" },
        query: { page: "1" },
      };
      const res = makeMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ name: "Product A" });
      expect(req.params).toEqual({ id: "10" });
      expect(res.locals.validatedQuery).toEqual({ page: "1" });
    });

    it("should call next() when schemas object is empty", () => {
      const middleware = validate({});

      const req: any = { body: {}, params: {}, query: {} };
      const res = makeMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return 400 VALIDATION_ERROR on ZodError", () => {
      const middleware = validate({
        body: z.object({
          email: z.string().email("Invalid email"),
        }),
      });

      const req: any = {
        body: { email: "not-an-email" },
      };
      const res = makeMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "VALIDATION_ERROR",
        details: [
          {
            field: "email",
            message: "Invalid email",
          },
        ],
      });
    });

    it("should call next(error) when a non-ZodError is thrown", () => {
      const fakeError = new Error("Unexpected internal error");
      const fakeSchema: any = {
        parse: () => {
          throw fakeError;
        },
      };

      const middleware = validate({
        body: fakeSchema,
      });

      const req: any = {
        body: { something: "test" },
      };
      const res = makeMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(fakeError);
      expect(res.status).not.toHaveBeenCalled();
    });
  });
});
