import cloudinary from "config/cloudinary";
import { Request, Response } from "express";
import { productCollection } from "models/product.model";
import sharp from "sharp";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

export const uploadImage = async (req: MulterRequest, res: Response) => {
  try {
    const file = req.file;
    if (
      !file ||
      !file.mimetype.startsWith("image/") ||
      file.size > 5 * 1024 * 1024
    ) {
      return res
        .status(400)
        .json({ error: "Invalid image: Only images <5MB allowed" });
    }

    const optimizedBuffer = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const uploadToCloudinary = (): Promise<any> => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "my_app_images",
            resource_type: "image",
            format: "webp",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(optimizedBuffer);
      });
    };

    const result = await uploadToCloudinary();

    return res.status(201).json({
      success: true,
      id: result.public_id,
      url: result.secure_url,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const getImage = async (req: Request, res: Response) => {
  try {
    const limit = parseInt((req.query.limit as string) || "20");

    const query = cloudinary.search
      .expression(`folder:"my_app_images"`)
      .sort_by("uploaded_at", "desc")
      .max_results(limit);

    const result = await query.execute();

    return res.json({
      success: true,
      images: result.resources.map((img: any) => ({
        id: img.public_id,
        url: img.secure_url,
        size: img.bytes,
        uploadedAt: img.created_at,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const deleteImage = async (req: Request, res: Response) => {
  try {
    const { public_id } = req.body;
    if (!public_id) return res.status(400).json({ error: "IMAGE_ID_REQUIRED" });

    const result = await cloudinary.uploader.destroy(public_id);

    if (result.result === "not found") {
      return res.status(404).json({ error: "IMAGE_NOT_FOUND" });
    }

    res.json({
      success: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};
