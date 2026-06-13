import ApiError from "../utils/ApiError.js";
import { redisClient } from "../config/redisClient.js";

const createRateLimiter = ({ limit, windowMs, keyFn }) => {
    return async (req, res, next) => {
        try {
            const key = `rl:${keyFn(req)}`;
            const now = Date.now();
            const windowStart = now - windowMs;

            await redisClient.zremrangebyscore(key, 0, windowStart);

            const currentCount = await redisClient.zcard(key);

            if (currentCount >= limit) {
                return next(
                    new ApiError(
                        429,
                        "Too many requests. Please try again later.",
                    ),
                );
            }

            await redisClient.zadd(key, now, `${now}-${Math.random()}`);
            await redisClient.expire(key, Math.ceil(windowMs / 1000));

            next();
        } catch (err) {
            console.error("Rate limiter error:", err.message);
            next();
        }
    };
};

export const loginLimiter = createRateLimiter({
    limit: 5,
    windowMs: 15 * 60 * 1000, // 5 attempts per 15 minutes
    keyFn: (req) => `login:${req.ip}:${req.body.email || ""}`,
});

export const registerLimiter = createRateLimiter({
    limit: 5,
    windowMs: 60 * 60 * 1000, // 3 registrations per hour per IP
    keyFn: (req) => `register:${req.ip}`,
});

export const otpLimiter = createRateLimiter({
    limit: 5,
    windowMs: 15 * 60 * 1000, // 5 OTP attempts per 15 minutes
    keyFn: (req) => `otp:${req.ip}:${req.body.email || ""}`,
});

export const refreshLimiter = createRateLimiter({
    limit: 10,
    windowMs: 15 * 60 * 1000,
    keyFn: (req) => `refresh:${req.ip}`,
});

export const transferLimiter = createRateLimiter({
    limit: 5,
    windowMs: 60 * 1000, // 5 transfers per minute per user
    keyFn: (req) => `transfer:${req.user.userId}`,
});

export const moneyLimiter = createRateLimiter({
    limit: 10,
    windowMs: 60 * 1000, // 10 deposits/withdrawals per minute per user
    keyFn: (req) => `money:${req.user.userId}`,
});
