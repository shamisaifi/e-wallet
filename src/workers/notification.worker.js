import { Worker } from "bullmq";
import { bullMQConnection } from "../config/redisClient.js";
import { pool } from "../config/db.js";
import {
    sendOtpEmail,
    sendWelcomeEmail,
    sendTransferDebitEmail,
    sendTransferCreditEmail,
    sendDepositEmail,
    sendWithdrawEmail,
} from "../services/mail.service.js";

const getUserById = async (userId) => {
    const result = await pool.query(
        "SELECT name, email FROM users WHERE user_id = $1",
        [userId],
    );
    return result.rows[0] || null;
};

const processJob = async (job) => {
    const { data } = job;

    switch (job.name) {
        case "SEND_OTP": {
            const { email, name, otp } = data;
            await sendOtpEmail(email, name, otp);
            break;
        }

        case "WELCOME_EMAIL": {
            const user = await getUserById(data.userId);
            if (!user) break;
            await sendWelcomeEmail(user.email, user.name);
            break;
        }

        case "TRANSFER_DEBIT": {
            const { senderId, receiverId, amount, senderNewBalance } = data;
            const sender = await getUserById(senderId);
            const receiver = await getUserById(receiverId);
            if (!sender || !receiver) break;
            await sendTransferDebitEmail(
                sender.email,
                sender.name,
                amount,
                receiver.name,
                senderNewBalance,
            );
            break;
        }

        case "TRANSFER_CREDIT": {
            const { senderId, receiverId, amount, receiverNewBalance } = data;
            const sender = await getUserById(senderId);
            const receiver = await getUserById(receiverId);
            if (!sender || !receiver) break;
            await sendTransferCreditEmail(
                receiver.email,
                receiver.name,
                amount,
                sender.name,
                receiverNewBalance,
            );
            break;
        }

        case "DEPOSIT_SUCCESS": {
            const { userId, amount, newBalance } = data;
            const user = await getUserById(userId);
            if (!user) break;
            await sendDepositEmail(user.email, user.name, amount, newBalance);
            break;
        }

        case "WITHDRAW_SUCCESS": {
            const { userId, amount, newBalance } = data;
            const user = await getUserById(userId);
            if (!user) break;
            await sendWithdrawEmail(user.email, user.name, amount, newBalance);
            break;
        }

        default:
            console.warn("Unknown job type:", job.name);
    }
};

export const notificationWorker = new Worker("notifications", processJob, {
    connection: bullMQConnection,
});

notificationWorker.on("completed", (job) => {
    console.log(`Job ${job.name} [${job.id}] completed`);
});

notificationWorker.on("failed", (job, err) => {
    console.error(`Job ${job.name} [${job.id}] failed:`, err.message);
});
