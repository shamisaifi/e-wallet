import express from "express";
import errorHandler from "./src/middleware/errorHandler.js";

const app = express();
app.use(express.json());

import authRoutes from "./src/routes/auth.routes.js";
import transactionsRoutes from "./src/routes/transactions.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionsRoutes);

app.use(errorHandler);

app.listen(8080, () => {
  console.log("server connected to port 8080");
});

