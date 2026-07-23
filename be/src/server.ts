import app from "./app";
import { Database } from "lib/mongodb-wrapper";

const PORT: number = parseInt(process.env.PORT || "3000", 10);

const db = Database.getInstance();
db.connect()
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection failed.", err);
  });
