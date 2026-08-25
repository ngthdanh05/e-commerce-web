import { Request, Response } from "express";
import { AuthRequest } from "middleware/auth";
import { ObjectId } from "mongodb";
import { userCollection } from "models/user.model";
import { orderCollection } from "models/order.model";

export const getOrderForAdmin = async (req: Request, res: Response) => {
  try {
    const orderCol = await orderCollection.getCollection();
    const userCol = await userCollection.getCollection();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      orderCol.find().sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
      orderCol.countDocuments(),
    ]);

    const user = orders
      .map((c) => c.userId)
      .filter(Boolean)
      .map((id) => new ObjectId(id));

    const users = await userCol.find({ _id: { $in: user } }).toArray();

    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const formatted = orders.map((o) => {
      const user = userMap.get(o.userId?.toString());

      return {
        id: o.orderId,
        user: user
          ? {
              fullName: user.name,
              email: user.email,
            }
          : null,
        status: o.status,
        amount: o.finalPrice ?? o.totalPrice ?? 0,
        createdAt: o.createdAt,
        method: o.paymentMethod,
      };
    });

    const totalPages = Math.ceil(total / limit);

    res.json({
      success: true,
      orders: formatted,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const updateOrderForAdmin = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["pending", "success", "failed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "INVALID_STATUS" });
    }

    const orderCol = await orderCollection.getCollection();

    const order = await orderCol.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    const result = await orderCol.updateOne({ orderId }, { $set: { status } });

    if (result.modifiedCount === 0) {
      return res.status(400).json({ error: "ORDER_NOT_UPDATED" });
    }

    return res.json({
      success: true,
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const deleteOrderForAdmin = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;

    const orderCol = await orderCollection.getCollection();

    const order = await orderCol.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    await orderCol.deleteOne({ orderId });

    return res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const getAllOrders = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }
    const orderCol = await orderCollection.getCollection();

    const rawStatus = String(req.query.status || "")
      .trim()
      .toLowerCase();
    const filter: any = { userId };

    if (["success", "pending", "failed"].includes(rawStatus)) {
      filter.status = rawStatus;
    }

    const [orders, total] = await Promise.all([
      orderCol
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .toArray(),
      orderCol.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / limit);

    const formatted = orders.map((o) => ({
      id: o.orderId,
      status: o.status,
      amount: o.finalPrice ?? o.totalPrice ?? 0,
      products: o.products,
      createdAt: o.createdAt,
      method: o.paymentMethod,
    }));
    res.json({
      orders: formatted,
      pagination: {
        currentPage: page,
        totalPages,
        total,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id: orderId } = req.params;

    const orderCol = await orderCollection.getCollection();
    const order = await orderCol.findOne({ orderId });

    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }
    const normalizeStatus = (status: any) => {
      if (typeof status === "string") return status;
      if (status?.state) return status.state;
      if (status?.value) return status.value;
      return "pending";
    };

    const formatted = {
      id: order.orderId,
      status: normalizeStatus(order.status),
      amount: order.finalPrice ?? order.totalPrice ?? 0,
      createdAt: order.createdAt,
      method: order.paymentMethod,
      products: order.products,
      userId: order.userId,
    };

    return res.json({ order: formatted });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const createOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(400).json({ error: "UNAUTHORIZED" });

    const { orderId, amount, paymentMethod } = req.body;
    const orderCol = await orderCollection.getCollection();

    const newOrder = {
      orderId,
      userId,
      amount,
      paymentMethod,
      status: "pending",
      createAt: new Date(),
    };

    await orderCol.insertOne(newOrder);

    return res.status(200).json({ success: true, orderId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const deleteOrder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ error: "UNAUTHORIZED" });
    }

    const { id: orderId } = req.params;

    const orderCol = await orderCollection.getCollection();

    const order = await orderCol.findOne({ orderId });
    if (!order) {
      return res.status(404).json({ error: "ORDER_NOT_FOUND" });
    }

    if (order.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    await orderCol.deleteOne({ orderId });

    return res.json({ success: true, message: "Order deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};
