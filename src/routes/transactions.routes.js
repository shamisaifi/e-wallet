import express from "express";
import { tranferMoney } from "../controllers/transactions.js";
import authenticate from "../middleware/authentication.js";

const router = express.Router();

router.post("/transfer/:receiverId", authenticate, tranferMoney);

export default router;
