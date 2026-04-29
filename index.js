import express from "express";
import errorHandler from "./src/middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

const app = express();

app.use(cors())
app.use(express.json());
app.use(cookieParser());
app.use(helmet());

import authRoutes from "./src/routes/auth.routes.js";
import transactionsRoutes from "./src/routes/transactions.routes.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/transactions", transactionsRoutes);

app.use(errorHandler);

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`server connected to port ${PORT}`);
});
