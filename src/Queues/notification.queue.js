import { Queue } from "bullmq";
import { bullMQConnection } from "../config/redisClient.js";

export const notificationQueue = new Queue("notifications", {
    connection: bullMQConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
    },
});

export const addNotificationJob = async (jobType, payload) => {
    try {
        await notificationQueue.add(jobType, payload);
    } catch (err) {
        console.error("Failed to add notification job:", err.message);
    }
};
