import { redisClient } from "../config/redisClient.js";

const setCache = async (key, data, next) => {
    try {
        await redisClient.set(key, JSON.stringify(data), "EX", 60);
        return true;
    } catch (error) {
        next(error);
    }
};

const getCache = async (key, next) => {
    try {
        const cachedData = await redisClient.get(key);
        if (!cachedData) {
            return false;
        }
        return JSON.parse(cachedData);
    } catch (error) {
        next(error);
    }
};

export { setCache, getCache };
