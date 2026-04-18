import express from "express";
import { deposit, tranferMoney, withdraw } from "../controllers/transactions.js";
import authenticate from "../middleware/authentication.js";

const router = express.Router();

router.post("/transfer/:receiverId", authenticate, tranferMoney);
router.post("/deposit", authenticate, deposit);
router.post("/withdraw", authenticate, withdraw);

export default router;
