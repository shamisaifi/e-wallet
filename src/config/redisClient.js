import Redis from "ioredis";

export const redisClient = new Redis()

redisClient.on("connect", () => console.log("Redis connected"));
redisClient.on("error", (err) => console.error("Redis error:", err));