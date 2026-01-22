import {
  deleteImage,
  getImage,
  uploadImage,
} from "../controllers/imageGridFS.controller";
import multer from "multer";
import express from "express";
import { verifyToken } from "middleware/auth";

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("image"), verifyToken, uploadImage);
router.get("/get", verifyToken, getImage);
router.delete("/delete", verifyToken, deleteImage);

export default router;
