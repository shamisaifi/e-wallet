import { redisClient } from "../config/redisClient.js";

const OTP_TTL = 10 * 60;

export const generateAndStoreOtp = async (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const key = `otp:${email}`;
    await redisClient.set(key, otp, "EX", OTP_TTL);
    return otp;
};

export const verifyOtp = async (email, otp) => {
    const key = `otp:${email}`;
    const stored = await redisClient.get(key);

    if (!stored || stored !== otp) {
        return false;
    }

    await redisClient.del(key);
    return true;
};
