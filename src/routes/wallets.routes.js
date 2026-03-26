import express from "express";
import authenticate from "../middleware/authentication.js";
import { createWallet } from "../controllers/wallet.js";

const router = express.Router();

router.post("/createWallet", authenticate, createWallet);

export default router