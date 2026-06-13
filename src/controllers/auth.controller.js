import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
    generateAccessToken,
    generateRefreshToken,
} from "../utils/generateToken.js";
import { generateAndStoreOtp, verifyOtp } from "../services/otp.service.js";
import { addNotificationJob } from "../queues/notification.queue.js";

// ─── Register ────────────────────────────────────────────────────────────────
// Creates unverified user. Does NOT create wallet yet.
// Wallet is created after OTP verification.

export const register = async (req, res, next) => {
    const { name, email, password, pin } = req.body;

    try {
        // Check existing user
        const existing = await pool.query(
            "SELECT user_id, is_verified FROM users WHERE email = $1",
            [email],
        );

        if (existing.rows.length > 0) {
            const user = existing.rows[0];

            if (user.is_verified) {
                return next(new ApiError(409, "Email already registered"));
            }

            // User exists but unverified — resend OTP
            const otp = await generateAndStoreOtp(email);
            await addNotificationJob("SEND_OTP", { email, name, otp });

            return res
                .status(200)
                .json(
                    new ApiResponse(
                        200,
                        "OTP resent to your email. Please verify your account.",
                    ),
                );
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const hashedPin = await bcrypt.hash(pin, 10);

        await pool.query(
            "INSERT INTO users (name, email, password, pin, is_verified) VALUES ($1, $2, $3, $4, FALSE)",
            [name, email, hashedPassword, hashedPin],
        );

        const otp = await generateAndStoreOtp(email);
        await addNotificationJob("SEND_OTP", { email, name, otp });

        return res
            .status(201)
            .json(
                new ApiResponse(
                    201,
                    "Registration successful. Check your email for the OTP.",
                ),
            );
    } catch (err) {
        next(err);
    }
};

// ─── Verify OTP ──────────────────────────────────────────────────────────────
// Verifies OTP, activates account, creates wallet.

export const verifyOtpHandler = async (req, res, next) => {
    const { email, otp } = req.body;

    try {
        const userResult = await pool.query(
            "SELECT user_id, name, is_verified FROM users WHERE email = $1",
            [email],
        );

        if (userResult.rows.length === 0) {
            return next(new ApiError(404, "User not found"));
        }

        const user = userResult.rows[0];

        if (user.is_verified) {
            return next(
                new ApiError(400, "Account already verified. Please login."),
            );
        }

        const isValid = await verifyOtp(email, otp);

        if (!isValid) {
            return next(new ApiError(400, "Invalid or expired OTP"));
        }

        // Activate account and create wallet in one transaction
        const client = await pool.connect();
        try {
            await client.query("BEGIN");

            await client.query(
                "UPDATE users SET is_verified = TRUE WHERE user_id = $1",
                [user.user_id],
            );

            await client.query("INSERT INTO wallets (user_id) VALUES ($1)", [
                user.user_id,
            ]);

            await client.query("COMMIT");
        } catch (err) {
            await client.query("ROLLBACK");
            throw err;
        } finally {
            client.release();
        }

        await addNotificationJob("WELCOME_EMAIL", { userId: user.user_id });

        return res
            .status(200)
            .json(
                new ApiResponse(
                    200,
                    "Account verified successfully. You can now login.",
                ),
            );
    } catch (err) {
        next(err);
    }
};

// ─── Resend OTP ───────────────────────────────────────────────────────────────

export const resendOtp = async (req, res, next) => {
    const { email } = req.body;

    try {
        const result = await pool.query(
            "SELECT name, is_verified FROM users WHERE email = $1",
            [email],
        );

        if (result.rows.length === 0) {
            return next(new ApiError(404, "User not found"));
        }

        const user = result.rows[0];

        if (user.is_verified) {
            return next(new ApiError(400, "Account already verified"));
        }

        const otp = await generateAndStoreOtp(email);
        await addNotificationJob("SEND_OTP", { email, name: user.name, otp });

        return res
            .status(200)
            .json(new ApiResponse(200, "OTP sent to your email"));
    } catch (err) {
        next(err);
    }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req, res, next) => {
    const { email, password } = req.body;

    try {
        const result = await pool.query(
            "SELECT user_id, name, password, is_verified FROM users WHERE email = $1",
            [email],
        );

        if (result.rows.length === 0) {
            return next(new ApiError(404, "User not found"));
        }

        const user = result.rows[0];

        if (!user.is_verified) {
            return next(
                new ApiError(
                    403,
                    "Account not verified. Please check your email for OTP.",
                ),
            );
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return next(new ApiError(401, "Invalid credentials"));
        }

        const payload = { userId: user.user_id };
        const accessToken = generateAccessToken(payload);
        const refreshToken = generateRefreshToken(payload);

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        return res.status(200).json(
            new ApiResponse(200, "Login successful", {
                accessToken,
                user: { id: user.user_id, name: user.name, email },
            }),
        );
    } catch (err) {
        next(err);
    }
};

// ─── Refresh Token ────────────────────────────────────────────────────────────

export const refresh = (req, res, next) => {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
        return next(new ApiError(401, "Refresh token not found"));
    }

    try {
        const decoded = jwt.verify(
            refreshToken,
            process.env.REFRESH_TOKEN_SECRET,
        );
        const accessToken = generateAccessToken({ userId: decoded.userId });

        return res
            .status(200)
            .json(new ApiResponse(200, "Token refreshed", { accessToken }));
    } catch (err) {
        return next(new ApiError(401, "Invalid or expired refresh token"));
    }
};

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = (req, res) => {
    res.clearCookie("refreshToken");
    return res
        .status(200)
        .json(new ApiResponse(200, "Logged out successfully"));
};


export const changePin = async (req, res, next) => {
    const { currentPin, newPin } = req.body;
    const { userId } = req.user;
    try {
        const result = await pool.query("SELECT pin FROM users WHERE user_id = $1", [userId]);
        if (result.rows.length === 0) return next(new ApiError(404, "User not found"));
        const valid = await bcrypt.compare(currentPin, result.rows[0].pin);
        if (!valid) return next(new ApiError(401, "Current PIN is incorrect"));
        const hashed = await bcrypt.hash(newPin, 10);
        await pool.query("UPDATE users SET pin = $1 WHERE user_id = $2", [hashed, userId]);
        return res.status(200).json(new ApiResponse(200, "PIN updated successfully"));
    } catch (err) {
        next(err);
    }
};