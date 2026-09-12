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

describe("SCRUM-28: Cart Module Validation & Handler Test Suite", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe("GET /api/cart - Get User Cart", () => {
    it("TC-CART-01: [Unauthorized] Returns 400 when request has no authenticated user", async () => {
      const response = createResponse();
      await getCart(createRequest({}, false), response);
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({ error: "UNAUTHORIZED" });
    });

    it("TC-CART-02: [Empty Cart] Returns default empty cart structure when no cart document exists", async () => {
      const { cartCol } = createCollections();
      cartCol.findOne.mockResolvedValue(null);
      const response = createResponse();

      await getCart(createRequest(), response);

      expect(response.json).toHaveBeenCalledWith({
        success: true,
        data: { products: [], totalPrice: 0 },
      });
    });

    it("TC-CART-03: [Valid Cart] Returns active cart data excluding database _id", async () => {
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

    it("TC-CART-04: [DB Error 500] Throws 500 when database collection query fails", async () => {
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

  describe("POST /api/cart - Add Item to Cart", () => {
    it("TC-CART-05: [Unauthorized] Reject adding item when unauthenticated", async () => {
      const response = createResponse();
      await addToCart(createRequest({ productId, quantity: 1 }, false), response);
      expect(response.status).toHaveBeenCalledWith(400);
    });

    it("TC-CART-06: [Missing Fields] Reject request missing productId or quantity", async () => {
      const response = createResponse();
      await addToCart(createRequest({ productId }), response);
      expect(response.status).toHaveBeenCalledWith(400);
      expect(response.json).toHaveBeenCalledWith({
        error: "Missing productId or quantity",
      });
    });

    it("TC-CART-07: [Product Not Found] Return 404 when product ID does not exist in DB", async () => {
      const { productCol } = createCollections();
      productCol.findOne.mockResolvedValue(null);
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(404);
    });

    it("TC-CART-08: [New Cart] Create brand new cart document using current DB price", async () => {
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

    it("TC-CART-09: [Update Quantity] Add quantity to existing item in cart and recalculate total", async () => {
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

    it("TC-CART-10: [Add New Item] Append distinct product to existing cart array", async () => {
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

    it("TC-CART-11: [DB Error 500] Throw 500 when product lookup fails during calculation", async () => {
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

    it("TC-CART-12: [DB Exception 500] Throw 500 on database connection exception", async () => {
      (productCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await addToCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });

  describe("PUT /api/cart - Update Cart Item Quantity", () => {
    it("TC-CART-13: [Validation & Missing] Handle unauthenticated, missing cart, and missing item", async () => {
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

    it("TC-CART-14: [Remove Item] Remove product item completely when quantity updated to 0", async () => {
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

    it("TC-CART-15: [Valid Update] Update item quantity to positive value and recalculate total", async () => {
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

    it("TC-CART-16: [DB Error 500] Return 500 error when update query fails", async () => {
      (cartCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await updateCart(createRequest({ productId, quantity: 1 }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });

  describe("DELETE /api/cart - Remove Cart Item", () => {
    it("TC-CART-17: [Validation] Reject unauthenticated, missing cart or item deletion", async () => {
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

    it("TC-CART-18: [Delete Success] Delete target product and recalculate cart total", async () => {
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

    it("TC-CART-19: [DB Error 500] Return 500 when deletion database call throws exception", async () => {
      (cartCollection.getCollection as jest.Mock).mockRejectedValue(
        new Error("db"),
      );
      const response = createResponse();

      await deleteCart(createRequest({ productId }), response);

      expect(response.status).toHaveBeenCalledWith(500);
    });
  });

  describe("Cart Schemas - Boundary Value Analysis (BVA)", () => {
    it("TC-CART-20: [Valid Schemas] Accept valid add and update quantities", () => {
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

    it("TC-CART-21: [Boundary Validation] Reject invalid quantity boundaries and product ids", () => {
      expect(() => addToCartSchema.parse({ productId, quantity: 0 })).toThrow();
      expect(() => addToCartSchema.parse({ productId, quantity: 100 })).toThrow();
      expect(() => addToCartSchema.parse({ productId, quantity: 1.5 })).toThrow();
      expect(() => updateCartSchema.parse({ productId, quantity: -1 })).toThrow();
      expect(() => deleteCartItemSchema.parse({ productId: "" })).toThrow();
    });
  });
});