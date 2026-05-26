import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
});

export const queue = new Queue("mail_queue", { connection });

export const addjob = async (jobtype, payload) => {
    await queue.add(jobtype, payload);
};