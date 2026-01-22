import { Request, Response } from "express";
import { Database } from "lib/mongodb-wrapper";
import { GridFSBucket, ObjectId } from "mongodb";
import sharp from "sharp";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

async function uploadImageToGridFS(
  buffer: Buffer,
  originalName: string
  //   author: string
): Promise<{ id: string; url: string }> {
  const db = Database.getInstance();

  const bucket = new GridFSBucket(await db.getDb(), { bucketName: "images" });

  const optimizedBuffer = await sharp(buffer)
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  const fileId = new ObjectId();

  const fileName = `${fileId.toHexString()}.webp`;

  const metadata = {
    // author,
    original_name: originalName || "image",
    optimized_size: optimizedBuffer.length,
    mimetype: "image/webp",
    uploadedAt: new Date(),
  };

  const uploadStream = bucket.openUploadStreamWithId(fileId, fileName, {
    metadata,
  });

  uploadStream.write(optimizedBuffer);

  uploadStream.end();

  return new Promise((resolve, reject) => {
    uploadStream.on("finish", () => {
      console.log(
        `Upload finish: ID=${fileId.toHexString()}, size=${
          optimizedBuffer.length
        }`
      );

      resolve({
        id: fileId.toHexString(),
        url: `/api/images/${fileId.toHexString()}`,
      });
    });
    uploadStream.on("error", (error) => {
      console.error("Stream error: ", error);

      reject(error);
    });
  });
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

    const { id, url } = await uploadImageToGridFS(
      file.buffer,
      file.originalname || "image.jpg"
    );

    return res.status(201).json({ success: true, id, url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const getImage = async (req: MulterRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || "1");
    const limit = parseInt((req.query.limit as string) || "20");

    const db = Database.getInstance();

    await db.connect();

    const dbInstance = await db.getDb();

    const filesCollection = dbInstance.collection("images.files");

    const files = await filesCollection
      .find({})
      .sort({ uploadDate: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const images = files.map((file) => ({
      id: file._id.toHexString(),
      fileName: file.filename,
      originalName: file.metadata?.original_name,
      size: file.length,
      uploadedAt: file.uploadDate,
      url: `/api/images/${file._id.toHexString()}`,
      deletable: true,
    }));

    const total = await filesCollection.countDocuments({});

    return res.json({
      success: true,
      images,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};

export const deleteImage = async (req: MulterRequest, res: Response) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Image ID is required" });
    }

    const db = Database.getInstance();

    await db.connect();

    const bucket = new GridFSBucket(await db.getDb(), { bucketName: "images" });

    const file_id = new ObjectId(id);

    await bucket.delete(file_id);

    return res
      .status(200)
      .json({ success: true, message: "Image deleted successfully", id: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
};
