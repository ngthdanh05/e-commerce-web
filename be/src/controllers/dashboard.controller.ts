import { Request, Response } from "express";
import { orderCollection } from "models/order.model";
import { productCollection } from "models/product.model";
import { userCollection } from "models/user.model";

export const getDashboardData = async (req: Request, res: Response) => {
  try {
    const productCol = await productCollection.getCollection();
    const totalProducts = await productCol.countDocuments();

    const userCol = await userCollection.getCollection();
    const totalUsers = await userCol.countDocuments();

    const orderCol = await orderCollection.getCollection();
    const allCheckouts = await orderCol
      .find({ status: { $in: ["pending", "success"] } })
      .toArray();

    const totalOrders = allCheckouts.length;

    const totalRevenue = allCheckouts.reduce(
      (sum, o) => sum + (o.finalPrice ?? o.totalPrice ?? 0),
      0,
    );

    const currentYear = new Date().getFullYear();

    const monthlyRevenueRaw = await orderCol
      .aggregate([
        {
          $match: {
            status: { $in: ["pending", "success"] },
            createdAt: {
              $gte: new Date(currentYear, 0, 1), // ngày 1/1 năm nay
              $lte: new Date(currentYear, 11, 31, 23, 59), // ngày 31/12 năm nay
            },
          },
        },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } },
            revenue: {
              $sum: { $ifNull: ["$finalPrice", "$totalPrice"] },
            },
            transactions: { $sum: 1 },
          },
        },
        { $sort: { "_id.month": 1 } },
      ])
      .toArray();

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthlyRevenue = monthNames.map((name, index) => {
      const record = monthlyRevenueRaw.find((m) => m._id.month === index + 1);
      return {
        month: name,
        revenue: record?.revenue ?? 0,
        transactions: record?.transactions ?? 0,
      };
    });

    return res.json({
      message: "Dashboard data fetched successfully",
      data: {
        totalProducts,
        totalUsers,
        totalOrders,
        totalRevenue,
        monthlyRevenue,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};
