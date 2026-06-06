import { redisClient } from "../config/redisClient.js";

const CACHE_TTL = 60; // seconds

export const setCache = async (key, data) => {
    try {
        await redisClient.set(key, JSON.stringify(data), "EX", CACHE_TTL);
    } catch (err) {
        console.error("Cache set error:", err.message);
    }
};

export const getCache = async (key) => {
    try {
        const raw = await redisClient.get(key);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (err) {
        console.error("Cache get error:", err.message);
        return null;
    }
};

export const deleteCache = async (key) => {
    try {
        await redisClient.del(key);
    } catch (err) {
        console.error("Cache delete error:", err.message);
    }
};
