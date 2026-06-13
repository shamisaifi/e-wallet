import express from "express";
import authnticate from "../middleware/authentication.js";
import {validate} from "../middleware/Validate.js"
import {loginSchema, registerSchema, resendOtpSchema, verifyOtpSchema} from "../middleware/Auth.validator.js"
import {
    changePin,
    login,
    logout,
    refresh,
    register,
    resendOtp,
    verifyOtpHandler,
} from "../controllers/auth.controller.js";
import {
    loginLimiter,
    otpLimiter,
    refreshLimiter,
    registerLimiter,
} from "../middleware/rateLimiter.js";
import authenticate from "../middleware/authentication.js";

const router = express.Router();

router.post("/register", registerLimiter, validate(registerSchema), register);
router.post("/verifyOtp", otpLimiter, validate(verifyOtpSchema), verifyOtpHandler);
router.post("/resend-otp", otpLimiter, validate(resendOtpSchema), resendOtp);
router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", refreshLimiter, refresh);
router.post("/logout", authnticate, logout);
router.post("/change-pin", authenticate, changePin);

export default router;
