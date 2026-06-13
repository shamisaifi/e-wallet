import express from "express";
import errorHandler from "./src/middleware/errorHandler.js";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import cors from "cors";

const app = express();

// app.use(cors())
// app.use(cors({ origin: [
//       "http://localhost:8081",
//     //   "http://10.88.165.142:8081",
//     "http://192.168.1.56:8081"
//     ], credentials: true }));

app.use(
    cors({
        origin: ["http://localhost:8081", "http://localhost:3000"],
        credentials: true,
    }),
);

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
