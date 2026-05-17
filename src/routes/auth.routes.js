import express from "express";
import authnticate from "../middleware/authentication.js";
import { login, logout, refesh, register } from "../controllers/auth.js";
import { loginLimiter, refreshLimiter} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refesh);
router.post("/logout", authnticate, logout);

export default router;
