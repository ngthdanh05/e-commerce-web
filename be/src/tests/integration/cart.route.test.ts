import request from "supertest";
import { ObjectId } from "mongodb";
import { productCollection } from "models/product.model";
import app from "app";
import { cartCollection } from "models/cart.model";

jest.mock("../../src/middleware/auth", () => ({
  verifyToken: (req: any, res: any, next: any) => {
    // Giả lập user đã đăng nhập thành công
    req.user = { _id: "test_user_123" };
    next();
  },
}));

describe("INTEGRATION TEST: Cart API (/api/cart)", () => {
  let mockProductId: string;

  beforeEach(async () => {
    const productCol = await productCollection.getCollection();
    const result = await productCol.insertOne({
      name: "Áo Nam Test",
      price: 100000,
      imageUrl: "http://example.com/image.png",
      created_at: new Date(),
    });
    mockProductId = result.insertedId.toString();
  });

  describe("GET /api/cart", () => {
    it("nên trả về giỏ hàng rỗng và totalPrice = 0 nếu chưa từng thêm sản phẩm", async () => {
      const res = await request(app).get("/api/cart");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products).toEqual([]);
      expect(res.body.data.totalPrice).toBe(0);
    });
  });

  describe("POST /api/cart/add", () => {
    it("nên thêm sản phẩm vào giỏ hàng thành công (HTTP 200)", async () => {
      const payload = {
        productId: mockProductId,
        quantity: 2,
      };

      const res = await request(app).post("/api/cart/add").send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Product added to cart");

      const cartCol = await cartCollection.getCollection();
      const cartInDb = await cartCol.findOne({ userId: "test_user_123" });
      expect(cartInDb).not.toBeNull();
      expect(cartInDb?.totalPrice).toBe(200000); // 100,000 * 2
    });

    it("nên trả về lỗi 400 nếu gửi thiếu productId hoặc quantity", async () => {
      const res = await request(app)
        .post("/api/cart/add")
        .send({ productId: mockProductId }); // Thiếu quantity

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Missing productId or quantity");
    });

    it("nên trả về lỗi 404 nếu productId không tồn tại trong DB", async () => {
      const fakeObjectId = new ObjectId().toString();

      const res = await request(app)
        .post("/api/cart/add")
        .send({ productId: fakeObjectId, quantity: 1 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Product not found");
    });
  });

  describe("PUT /api/cart/update", () => {
    it("nên cập nhật số lượng sản phẩm trong giỏ hàng thành công", async () => {
      await request(app)
        .post("/api/cart/add")
        .send({ productId: mockProductId, quantity: 1 });

      const res = await request(app)
        .put("/api/cart/update")
        .send({ productId: mockProductId, quantity: 5 });

      expect(res.status).toBe(200);
      expect(res.body.totalPrice).toBe(500000);
    });
  });

  describe("DELETE /api/cart/delete", () => {
    it("nên xóa sản phẩm khỏi giỏ hàng thành công", async () => {
      await request(app)
        .post("/api/cart/add")
        .send({ productId: mockProductId, quantity: 1 });

      const res = await request(app)
        .delete("/api/cart/delete")
        .send({ productId: mockProductId });

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBe(0);
      expect(res.body.totalPrice).toBe(0);
    });
  });
});
