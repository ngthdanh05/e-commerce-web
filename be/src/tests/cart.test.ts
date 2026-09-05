import { ObjectId } from "mongodb";
import {
  addToCart,
  deleteCart,
  getCart,
  updateCart,
} from "../controllers/cart.controller";
import {
  addToCartSchema,
  deleteCartItemSchema,
  updateCartSchema,
} from "../schemas/cart.schema";
import { cartCollection } from "../models/cart.model";
import { productCollection } from "../models/product.model";

jest.mock("../models/cart.model", () => ({
  cartCollection: { getCollection: jest.fn() },
}));

jest.mock("../models/product.model", () => ({
  productCollection: { getCollection: jest.fn() },
}));

const userId = new ObjectId();
const productId = new ObjectId().toHexString();
const product = {
  _id: new ObjectId(productId),
  name: "Test Product",
  imageUrl: "/product.png",
  price: 500000,
};

const createResponse = () => {
  const response: any = {};
  response.status = jest.fn().mockReturnValue(response);
  response.json = jest.fn().mockReturnValue(response);
  return response;
};

const createRequest = (body: any = {}, authenticated = true): any => ({
  body,
  user: authenticated
    ? { _id: userId, email: "test@example.com", role: "user" }
    : undefined,
});

const createCollections = () => {
  const cartCol = {
    findOne: jest.fn(),
    insertOne: jest.fn().mockResolvedValue({ acknowledged: true }),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  };
  const productCol = {
    findOne: jest.fn().mockResolvedValue(product),
    find: jest
      .fn()
      .mockReturnValue({ toArray: jest.fn().mockResolvedValue([product]) }),
  };

  (cartCollection.getCollection as jest.Mock).mockResolvedValue(cartCol);
  (productCollection.getCollection as jest.Mock).mockResolvedValue(productCol);

  return { cartCol, productCol };
};

describe("Cart controller", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("getCart", () => {
    it("returns unauthorized when the request has no user", async () => {
      const response = createResponse();

      await getCart(createRequest({}, false), response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({ error: "UNAUTHORIZED" });
    });

    it("returns an empty cart when no cart exists", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue(null);
      const response = createResponse();

      await getCart(createRequest(), response);

      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { products: [], totalPrice: 0 },
      });
    });

    it("returns cart data without the database id", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId, quantity: 2 }],
        totalPrice: 1000000,
      });
      const response = createResponse();

      await getCart(createRequest(), response);

      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: {
          userId,
          products: [{ productId, quantity: 2 }],
          totalPrice: 1000000,
        },
      });
    });

    it("returns 500 when the cart lookup fails", async () => {
      (cartCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await getCart(createRequest(), response);

      expect(response.status).toHaveBeenCalledWith(500);
      expect(response.json).toHaveBeenCalledWith({
        error: "INTERNAL_SERVER_ERROR",
      });
    });
  });

  describe("addToCart", () => {
    it("returns unauthorized when the request has no user", async () => {
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }, false), response);

      expect(response.status).toHaveBeenCalledWith(400);
    });

    it("rejects a missing product id or quantity", async () => {
      const response = createResponse();

      await addToCart(createRequest({ productId }), response);

      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        error: "Missing productId or quantity",
      });
    });

    it("returns 404 when the product does not exist", async () => {
      const { productCol } = createCollections();
      productCol.findOne.mockResolvedValue(null);
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it("inserts a new cart using the database price", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue(null);
      const response = createResponse();

      await addToCart(
        createRequest({ productId, quantity: 2, price: 1 }),
        response,
      );

      expect(cartCol.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({
          userId,
          totalPrice: 1000000,
          products: [expect.objectContaining({ price: 500000, quantity: 2 })],
        }),
      );
      expect(response.json).toHaveBeenCalledWith({
        success: true,
        message: "Product added to cart",
      });
    });

    it("updates an existing item and recalculates its price", async () => {
      const { cartCol, productCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId, name: "Old", imageUrl: "old", price: 1, quantity: 2 }],
        totalPrice: 2,
      });
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 3 }), response);

      expect(productCol.find).toHaveBeenCalled();
      expect(cartCol.updateOne).toHaveBeenCalledWith(
        { userId },
        {
          $set: expect.objectContaining({
            totalPrice: 2500000,
            products: [expect.objectContaining({ quantity: 5, price: 500000 })],
          }),
        },
      );
    });

    it("adds a different item to an existing cart", async () => {
      const { cartCol, productCol } = createCollections();
      productCol.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([
          product,
          { _id: "other", name: "Other", imageUrl: "other", price: 100 },
        ]),
      });
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId: "other", quantity: 1, price: 100 }],
        totalPrice: 100,
      });
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(cartCol.updateOne).toHaveBeenCalledWith(
        { userId },
        {
          $set: expect.objectContaining({
            products: expect.arrayContaining([
              expect.objectContaining({ productId }),
              expect.objectContaining({ productId: "other" }),
            ]),
            totalPrice: 500100,
          }),
        },
      );
    });

    it("returns 500 when recalculation cannot find a cart product", async () => {
      const { cartCol, productCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId: "missing", quantity: 1 }],
        totalPrice: 0,
      });
      productCol.find.mockReturnValue({
        toArray: jest.fn().mockResolvedValue([]),
      });
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });

    it("returns 500 when adding fails", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });

  describe("updateCart", () => {
    it("handles unauthorized, missing cart, and missing item", async () => {
      const unauthorized = createResponse();
      await updateCart(
        createRequest({ productId, quantity: 1 }, false),
        unauthorized,
      );
      expect(unauthorized.status).toHaveBeenCalledWith(400);

      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValueOnce(null);
      const missingCart = createResponse();
      await updateCart(createRequest({ productId, quantity: 1 }), missingCart);
      expect(missingCart.status).toHaveBeenCalledWith(404);

      cartCol.findOne.mockResolvedValueOnce({ products: [] });
      const missingItem = createResponse();
      await updateCart(createRequest({ productId, quantity: 1 }), missingItem);
      expect(missingItem.status).toHaveBeenCalledWith(404);
    });

    it("removes an item when quantity is zero", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId, quantity: 2, price: 500000 }],
        totalPrice: 1000000,
      });
      const response = createResponse();

      await updateCart(createRequest({ productId, quantity: 0 }), response);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({ products: [], totalPrice: 0 }),
      );
    });

    it("updates an item when quantity is positive", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [{ productId, quantity: 2, price: 1 }],
        totalPrice: 2,
      });
      const response = createResponse();

      await updateCart(createRequest({ productId, quantity: 4 }), response);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [expect.objectContaining({ quantity: 4, price: 500000 })],
          totalPrice: 2000000,
        }),
      );
    });

    it("returns 500 when updating fails", async () => {
      (cartCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await updateCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });

  describe("deleteCart", () => {
    it("handles unauthorized, missing cart, and missing item", async () => {
      const unauthorized = createResponse();
      await deleteCart(createRequest({ productId }, false), unauthorized);
      expect(unauthorized.status).toHaveBeenCalledWith(400);

      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValueOnce(null);
      const missingCart = createResponse();
      await deleteCart(createRequest({ productId }), missingCart);
      expect(missingCart.status).toHaveBeenCalledWith(404);

      cartCol.findOne.mockResolvedValueOnce({ products: [] });
      const missingItem = createResponse();
      await deleteCart(createRequest({ productId }), missingItem);
      expect(missingItem.status).toHaveBeenCalledWith(404);
    });

    it("deletes an item and recalculates the total", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId,
        products: [
          { productId, quantity: 2, price: 500000 },
          { productId: "other", quantity: 1, price: 100 },
        ],
        totalPrice: 1000100,
      });
      const response = createResponse();

      await deleteCart(createRequest({ productId }), response);

      expect(response.json).toHaveBeenCalledWith(
        expect.objectContaining({
          products: [{ productId: "other", quantity: 1, price: 100 }],
          totalPrice: 100,
        }),
      );
    });

    it("returns 500 when deleting fails", async () => {
      (cartCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await deleteCart(createRequest({ productId }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });
});

describe("Cart schemas", () => {
  it("accepts valid add and update quantities", () => {
    expect(addToCartSchema.parse({ productId, quantity: 1 })).toEqual({
      productId,
      quantity: 1,
    });
    expect(addToCartSchema.parse({ productId, quantity: 99 })).toEqual({
      productId,
      quantity: 99,
    });
    expect(updateCartSchema.parse({ productId, quantity: 0 })).toEqual({
      productId,
      quantity: 0,
    });
  });

  it("rejects invalid quantity boundaries and product ids", () => {
    expect(() => addToCartSchema.parse({ productId, quantity: 0 })).toThrow();
    expect(() => addToCartSchema.parse({ productId, quantity: 100 })).toThrow();
    expect(() => addToCartSchema.parse({ productId, quantity: 1.5 })).toThrow();
    expect(() => updateCartSchema.parse({ productId, quantity: -1 })).toThrow();
    expect(() => deleteCartItemSchema.parse({ productId: "" })).toThrow();
  });
});
