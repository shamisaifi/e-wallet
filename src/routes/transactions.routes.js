import express from "express";
import {
     checkBalance,
     deposit,
     transactionHistory,
     transfer,
     withdraw,
} from "../controllers/transaction.controller.js";
import authenticate from "../middleware/authentication.js";
import { moneyLimiter, transferLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/balance", authenticate, checkBalance);
router.get("/tran-history", authenticate, transactionHistory);
router.post("/transfer/:receiverId", authenticate, transferLimiter, transfer);
router.post("/deposit", authenticate, moneyLimiter, deposit);
router.post("/withdraw", authenticate, moneyLimiter, withdraw);

export default router;
