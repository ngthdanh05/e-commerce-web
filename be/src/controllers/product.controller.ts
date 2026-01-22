import cloudinary from "config/cloudinary";
import { Request, Response } from "express";
import { productCollection } from "models/product.model";
import { ObjectId } from "mongodb";

export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const col = await productCollection.getCollection();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      col
        .find()
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .project({ created_at: 0 })
        .toArray(),
      col.countDocuments(),
    ]);

    const formattedProducts = products.map((product) => ({
      ...product,
      id: product._id.toString(),
      _id: undefined,
    }));

    const totalPages = Math.ceil(total / limit);

    return res.json({
      products: formattedProducts,
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

export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id))
      return res.status(400).json({ error: "Data are required" });

    const col = await productCollection.getCollection();

    const product = await col.findOne({ _id: new ObjectId(id) });

    if (!product) return res.status(404).json({ error: "Product not found" });

    const formattedProduct = {
      ...product,
      id: id,
    };

    res.json({ success: true, data: formattedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Please login to continue" });
    }
    const { name, price, description, category, imageUrl, public_id } =
      req.body;

    if (!name || !price || !description || !imageUrl || !category)
      return res.status(400).json({ error: "Data are required" });

    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "Invalid category id format" });
    }

    const col = await productCollection.getCollection();

    const newProduct = {
      _id: new ObjectId(),
      name,
      price: Number(price),
      category: category
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^\w\-]+/g, ""),
      description,
      imageUrl: imageUrl || "",
      public_id: public_id || "",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await col.insertOne(newProduct);
    if (!result.acknowledged) {
      return res.status(500).json({ error: "Failed to add blog" });
    }

    const insertedProduct = { ...newProduct, id: newProduct._id.toString() };

    res.status(200).json({ success: true, product: insertedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { name, price, category, description, imageUrl, public_id } =
      req.body;

    if (!name || !price || !description || !imageUrl || !category)
      return res.status(400).json({ error: "Data are required" });

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    const col = await productCollection.getCollection();

    const result = await col.updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: {
          name,
          price: Number(price),
          description,
          category: category
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^\w\-]+/g, ""),
          imageUrl,
          public_id,
          updated_at: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ error: "Failed to update product" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !ObjectId.isValid(id))
      return res.status(400).json({ error: "Product ID is required" });

    const col = await productCollection.getCollection();

    const product = await col.findOne({ _id: new ObjectId(id) });

    if (!product) {
      return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });
    }

    if (product.public_id) {
      await cloudinary.uploader.destroy(product.public_id);
    }

    await col.deleteOne({ _id: new ObjectId(id) });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
