import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

export const redisClient = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
});

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.error("Redis error:", err.message));

// BullMQ connection
export const bullMQConnection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
});
