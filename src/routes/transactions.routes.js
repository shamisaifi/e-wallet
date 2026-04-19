import express from "express";
import {
  checkBalance,
  deposit,
  tranferMoney,
  transactionHistory,
  withdraw,
} from "../controllers/transactions.js";
import authenticate from "../middleware/authentication.js";

const router = express.Router();

router.get("/balance", authenticate, checkBalance);
router.get("/tran-history", authenticate, transactionHistory);
router.post("/transfer/:receiverId", authenticate, tranferMoney);
router.post("/deposit", authenticate, deposit);
router.post("/withdraw", authenticate, withdraw);

export default router;
