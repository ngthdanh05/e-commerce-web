import cloudinary from "config/cloudinary";
import sharp from "sharp";
import {
  uploadImage,
  getImage,
  deleteImage,
} from "../controllers/imageCloudinary.controller";

jest.mock("sharp");

jest.mock("config/cloudinary", () => ({
  __esModule: true,
  default: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    search: {
      expression: jest.fn().mockReturnThis(),
      sort_by: jest.fn().mockReturnThis(),
      max_results: jest.fn().mockReturnThis(),
      execute: jest.fn(),
    },
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

describe("Image Cloudinary Controller Unit Tests", () => {
  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    const searchMock: any = {};
    searchMock.expression = jest.fn().mockReturnValue(searchMock);
    searchMock.sort_by = jest.fn().mockReturnValue(searchMock);
    searchMock.max_results = jest.fn().mockReturnValue(searchMock);
    searchMock.execute = jest.fn();
    (cloudinary as any).search = searchMock;
  });

  describe("uploadImage", () => {
    it("should return 400 if no file is provided", async () => {
      const req = makeMockReq();
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid image: Only images <5MB allowed",
      });
    });

    it("should return 400 if file mimetype is not image", async () => {
      const req = makeMockReq({
        file: {
          mimetype: "text/plain",
          size: 1024,
          buffer: Buffer.from("test"),
        },
      });
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid image: Only images <5MB allowed",
      });
    });

    it("should return 400 if file size exceeds 5MB", async () => {
      const req = makeMockReq({
        file: {
          mimetype: "image/jpeg",
          size: 6 * 1024 * 1024,
          buffer: Buffer.from("test"),
        },
      });
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Invalid image: Only images <5MB allowed",
      });
    });

    it("should process and upload image successfully", async () => {
      const mockBuffer = Buffer.from("fake-optimized-image");
      (sharp as unknown as jest.Mock).mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options: any, callback: any) => {
          return {
            end: jest.fn().mockImplementation((buf: Buffer) => {
              callback(null, {
                public_id: "img_test_123",
                secure_url: "https://cloudinary.com/img_test_123.webp",
              });
            }),
          };
        }
      );

      const req = makeMockReq({
        file: {
          mimetype: "image/png",
          size: 1024 * 1024,
          buffer: Buffer.from("test-image-data"),
        },
      });
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        id: "img_test_123",
        url: "https://cloudinary.com/img_test_123.webp",
      });
    });

    it("should return 500 when cloudinary upload_stream errors", async () => {
      const mockBuffer = Buffer.from("fake-optimized-image");
      (sharp as unknown as jest.Mock).mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      });

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options: any, callback: any) => {
          return {
            end: jest.fn().mockImplementation(() => {
              callback(new Error("Cloudinary upload failed"), null);
            }),
          };
        }
      );

      const req = makeMockReq({
        file: {
          mimetype: "image/png",
          size: 1024 * 1024,
          buffer: Buffer.from("test-image-data"),
        },
      });
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "INTERNAL_SERVER_ERROR",
      });
    });

    it("should return 500 when sharp processing throws error", async () => {
      (sharp as unknown as jest.Mock).mockReturnValue({
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockRejectedValue(new Error("Sharp error")),
      });

      const req = makeMockReq({
        file: {
          mimetype: "image/png",
          size: 1024 * 1024,
          buffer: Buffer.from("corrupt-image-data"),
        },
      });
      const res = makeMockRes();

      await uploadImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  describe("getImage", () => {
    it("should return images with custom limit query", async () => {
      const mockResources = [
        {
          public_id: "res_1",
          secure_url: "https://cloudinary.com/res_1.webp",
          bytes: 54321,
          created_at: "2026-03-01T10:00:00Z",
        },
      ];

      ((cloudinary as any).search.execute as jest.Mock).mockResolvedValue({
        resources: mockResources,
      });

      const req = makeMockReq({ query: { limit: "15" } });
      const res = makeMockRes();

      await getImage(req, res);

      expect((cloudinary as any).search.max_results).toHaveBeenCalledWith(15);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        images: [
          {
            id: "res_1",
            url: "https://cloudinary.com/res_1.webp",
            size: 54321,
            uploadedAt: "2026-03-01T10:00:00Z",
          },
        ],
      });
    });

    it("should return images with default limit 20 when limit query is absent", async () => {
      ((cloudinary as any).search.execute as jest.Mock).mockResolvedValue({
        resources: [],
      });

      const req = makeMockReq({ query: {} });
      const res = makeMockRes();

      await getImage(req, res);

      expect((cloudinary as any).search.max_results).toHaveBeenCalledWith(20);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        images: [],
      });
    });

    it("should return 500 when cloudinary search throws error", async () => {
      ((cloudinary as any).search.execute as jest.Mock).mockRejectedValue(
        new Error("Search execution error")
      );

      const req = makeMockReq({ query: {} });
      const res = makeMockRes();

      await getImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  describe("deleteImage", () => {
    it("should return 400 if public_id is missing", async () => {
      const req = makeMockReq({ body: {} });
      const res = makeMockRes();

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "IMAGE_ID_REQUIRED",
      });
    });

    it("should return 404 if cloudinary returns 'not found'", async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
        result: "not found",
      });

      const req = makeMockReq({ body: { public_id: "nonexistent_id" } });
      const res = makeMockRes();

      await deleteImage(req, res);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("nonexistent_id");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "IMAGE_NOT_FOUND",
      });
    });

    it("should delete image successfully when cloudinary returns ok", async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue({
        result: "ok",
      });

      const req = makeMockReq({ body: { public_id: "valid_id" } });
      const res = makeMockRes();

      await deleteImage(req, res);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith("valid_id");
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Image deleted successfully",
      });
    });

    it("should return 500 when cloudinary destroy throws an error", async () => {
      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error("Destroy error")
      );

      const req = makeMockReq({ body: { public_id: "error_id" } });
      const res = makeMockRes();

      await deleteImage(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "INTERNAL_SERVER_ERROR",
      });
    });
  });
});
