import { getDashboardData } from "../controllers/dashboard.controller";
import { orderCollection } from "../models/order.model";
import { productCollection } from "../models/product.model";
import { userCollection } from "../models/user.model";

jest.mock("../models/order.model", () => ({
  orderCollection: {
    getCollection: jest.fn(),
  },
}));

jest.mock("../models/product.model", () => ({
  productCollection: {
    getCollection: jest.fn(),
  },
}));

jest.mock("../models/user.model", () => ({
  userCollection: {
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

describe("Dashboard Controller Unit Tests", () => {
  let mockProductCol: any;
  let mockUserCol: any;
  let mockOrderCol: any;

  beforeAll(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockProductCol = {
      countDocuments: jest.fn(),
    };
    mockUserCol = {
      countDocuments: jest.fn(),
    };
    mockOrderCol = {
      find: jest.fn(),
      aggregate: jest.fn(),
    };

    (productCollection.getCollection as jest.Mock).mockResolvedValue(mockProductCol);
    (userCollection.getCollection as jest.Mock).mockResolvedValue(mockUserCol);
    (orderCollection.getCollection as jest.Mock).mockResolvedValue(mockOrderCol);
  });

  it("should return complete dashboard data with revenue calculations and monthly records", async () => {
    mockProductCol.countDocuments.mockResolvedValue(50);
    mockUserCol.countDocuments.mockResolvedValue(25);

    const mockOrders = [
      { status: "success", finalPrice: 150000, totalPrice: 180000 },
      { status: "pending", totalPrice: 200000 }, // finalPrice is undefined
      { status: "success" }, // both finalPrice and totalPrice are undefined
    ];

    mockOrderCol.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(mockOrders),
    });

    const mockMonthlyRevenueRaw = [
      { _id: { month: 1 }, revenue: 150000, transactions: 1 }, // Jan: has revenue & transactions
      { _id: { month: 2 }, revenue: null, transactions: null }, // Feb: null revenue & transactions
    ];

    mockOrderCol.aggregate.mockReturnValue({
      toArray: jest.fn().mockResolvedValue(mockMonthlyRevenueRaw),
    });

    const req = makeMockReq();
    const res = makeMockRes();

    await getDashboardData(req, res);

    expect(mockProductCol.countDocuments).toHaveBeenCalled();
    expect(mockUserCol.countDocuments).toHaveBeenCalled();
    expect(mockOrderCol.find).toHaveBeenCalledWith({
      status: { $in: ["pending", "success"] },
    });
    expect(mockOrderCol.aggregate).toHaveBeenCalled();

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Dashboard data fetched successfully",
        data: expect.objectContaining({
          totalProducts: 50,
          totalUsers: 25,
          totalOrders: 3,
          totalRevenue: 350000, // 150000 + 200000 + 0
          monthlyRevenue: expect.arrayContaining([
            { month: "January", revenue: 150000, transactions: 1 },
            { month: "February", revenue: 0, transactions: 0 },
            { month: "March", revenue: 0, transactions: 0 },
          ]),
        }),
      })
    );
  });

  it("should return 500 when productCol throws an error", async () => {
    mockProductCol.countDocuments.mockRejectedValue(new Error("Product DB Error"));

    const req = makeMockReq();
    const res = makeMockRes();

    await getDashboardData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
  });

  it("should return 500 when orderCol aggregate throws an error", async () => {
    mockProductCol.countDocuments.mockResolvedValue(10);
    mockUserCol.countDocuments.mockResolvedValue(5);
    mockOrderCol.find.mockReturnValue({
      toArray: jest.fn().mockResolvedValue([]),
    });
    mockOrderCol.aggregate.mockReturnValue({
      toArray: jest.fn().mockRejectedValue(new Error("Aggregation DB Error")),
    });

    const req = makeMockReq();
    const res = makeMockRes();

    await getDashboardData(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "INTERNAL_SERVER_ERROR" });
  });
});
