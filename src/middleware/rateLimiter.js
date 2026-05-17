import Redis from "ioredis";
import ApiError from "../utils/ApiError.js";

const redis = new Redis();

export function createRateLimiter({ limit, windowMs, keyFn }) {
  return async (req, res, next) => {
    try {
      const key = `ratelimit:${keyFn(req)}`;

      const now = Date.now();
      const windowStart = now - windowMs;

      await redis.zremrangebyscore(key, 0, windowStart);
      const currentCount = await redis.zcard(key);

      if (currentCount >= limit) {
        return next(
          new ApiError(429, "Too many requests. Please try again later.")
        );
      }

      await redis.zadd(key, now, `${now}-${Math.random()}`);
      await redis.expire(key, Math.ceil(windowMs / 1000));

      next();
    } catch (error) {
      next(error);
    }
  };
}

// login limiter
export const loginLimiter = createRateLimiter({
  limit: 5,
  windowMs: 15 * 60 * 1000,
  keyFn: (req) => `login:${req.ip}:${req.body.email || ""}`,
});

// refresh limiter
export const refreshLimiter = createRateLimiter({
  limit: 10,
  windowMs: 15 * 60 * 1000,
  keyFn: (req) => `refresh:${req.ip}`,
});

// transfer limiter
export const transferLimiter = createRateLimiter({
  limit: 3,
  windowMs: 60 * 1000,
  keyFn: (req) => `transfer:${req.user.id}`,
});

// deposit + withdraw limiter
export const moneyLimiter = createRateLimiter({
  limit: 10,
  windowMs: 60 * 1000,
  keyFn: (req) => `money:${req.user.id}`,
});
