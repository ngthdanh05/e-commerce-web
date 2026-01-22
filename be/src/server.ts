import express, { Application } from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { Database } from "lib/mongodb-wrapper";
import usersRoutes from "./routes/users.route";
import authRoutes from "./routes/auth.route";
import productRoutes from "./routes/product.route";
import cartRoutes from "./routes/cart.route";
import checkoutRoutes from "./routes/checkout.route";
import orderRoutes from "./routes/order.route";
import adminRoutes from "./routes/admin.route";
// import imageRoutes from "./routes/imageGridFS.route";
import imageRoutes from "./routes/imageCloudinary.route";

dotenv.config();
const app: Application = express();
const PORT: number = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    exposedHeaders: ["Authorization"],
  })
);

app.use("/api", usersRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/images", imageRoutes);

const db = Database.getInstance();
db.connect()
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection failed.", err);
  });

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
