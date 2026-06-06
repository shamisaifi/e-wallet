import { redisClient } from "../config/redisClient.js";
import crypto from "crypto";

export const aquireLock = async (key, ttlSeconds) => {
    const lockValue = crypto.randomUUID();
    const lock = await redisClient.set(key, lockValue, "NX", "EX", ttlSeconds);
    return lock;
};

export const releaseLock = async (key) => {
    try {
        await redisClient.del(key);
    } catch (error) {
        console.error("Lock release error:", err.message);
    }
};
