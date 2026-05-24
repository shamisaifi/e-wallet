import { redisClient } from "../middleware/redisClient.js"
import crypto from 'crypto'

export const aquireLock = async (key, ttlSeconds) => {
    lockValue = crypto.randomUUID()
    const lock = await redisClient.set(key, lockValue, "NX", "EX", ttlSeconds)
    return lock
}

export const releaseLock = async(key) => {
    await redisClient.del(key)
}