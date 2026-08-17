import { Request, Response } from "express";
import { userCollection } from "models/user.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { AuthRequest } from "middleware/auth";
import { ObjectId } from "mongodb";
dotenv.config();

export const registerUser = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "ACCOUNT_INVALID" });

    const col = await userCollection.getCollection();

    const exists = await col.findOne({ email });

    if (exists) return res.status(400).json("ACCOUNT_ALREADY_EXISTS");

    const password_hash = await bcrypt.hash(password, 10);

    await col.insertOne({
      email,
      name,
      password_hash,
      role: "user",
      created_at: new Date(),
    });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "ACCOUNT_INVALID" });

    const col = await userCollection.getCollection();

    const user = await col.findOne({ email });

    if (!user) return res.status(404).json({ error: "ACCOUNT_NOT_FOUND" });

    if (user.isBlocked) {
      return res.status(403).json({ error: "This account has been blocked" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "WRONG_PASSWORD" });
    }

    const token = jwt.sign(
      { _id: user._id.toString(), email, role: user.role },
      process.env.JWT_SECRET!,
      {
        expiresIn: "7d",
      },
    );

    res.cookie("session_token", token, {
      httpOnly: true,
      sameSite: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.json({ success: true, data: { user, token } });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const logoutUser = async (req: Request, res: Response) => {
  try {
    res.clearCookie("session_token", { path: "/" });
    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Logout failed" });
  }
};

export const profile = async (req: AuthRequest, res: Response) => {
  try {
    const col = await userCollection.getCollection();
    const user = await col.findOne(
      { email: req.user?.email },
      { projection: { password_hash: 0 } },
    );
    if (!user)
      return res
        .status(404)
        .json({ success: false, message: "USER_NOT_FOUND" });

    return res.json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "INTERNAL_SERVER_ERROR" });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const col = await userCollection.getCollection();

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      col
        .find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .project({ password_hash: 0 })
        .toArray(),
      col.countDocuments(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return res.json({
      users,
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
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const toggleBlockUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { block } = req.body;

    const col = await userCollection.getCollection();

    const user = await col.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          isBlocked: Boolean(block),
        },
      },
    );

    return res.json({
      success: true,
      message: block ? "User has been blocked" : "User has been unblocked",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const col = await userCollection.getCollection();

    const user = await col.findOne({ _id: new ObjectId(id) });
    if (!user) {
      return res.status(404).json({ error: "USER_NOT_FOUND" });
    }

    await col.deleteOne({ _id: new ObjectId(id) });

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};
