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
import {validate} from "../middleware/Validate.js"
import { depositSchema, transferSchema, withdrawSchema } from "../middleware/Transaction.validator.js"

const router = express.Router();

router.get("/balance", authenticate, checkBalance);
router.get("/tran-history", authenticate, transactionHistory);
router.post("/transfer/:receiverId", authenticate, transferLimiter, validate(transferSchema), transfer);
router.post("/deposit", authenticate, moneyLimiter, validate(depositSchema), deposit);
router.post("/withdraw", authenticate, moneyLimiter, validate(withdrawSchema), withdraw);

export default router;
