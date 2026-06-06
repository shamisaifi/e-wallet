import express from "express";
import authnticate from "../middleware/authentication.js";
import {
    login,
    logout,
    refresh,
    register,
    resendOtp,
    verifyOtpHandler,
} from "../controllers/auth.controller.js";
import {
    loginLimiter,
    refreshLimiter,
    registerLimiter,
} from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/verifyOtp", verifyOtpHandler);
router.post("/resend-otp", resendOtp);
router.post("/login", loginLimiter, login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", authnticate, logout);

export default router;
