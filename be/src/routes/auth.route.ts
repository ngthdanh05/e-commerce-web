import {
  loginUser,
  logoutUser,
  registerUser,
} from "controllers/user.controller";
import express from "express";
import { validate } from "middleware/validate";
import { loginSchema, registerSchema } from "schemas/auth.schema";

const router = express.Router();

router.post("/register", validate({ body: registerSchema }), registerUser);
router.post("/login", validate({ body: loginSchema }), loginUser);
router.post("/logout", logoutUser);

export default router;
