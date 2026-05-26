import { Worker } from "bullmq";
import { sendMail } from "../config/mailer.js";
import { pool } from "../config/db.js";
import IORedis from "ioredis";

const connection = new IORedis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,  // required by BullMQ
});

const worker = new Worker(
    "mail_queue",
    async (job) => {
        const { user, amount } = job.data;

        if (job.name === "TRANSFER_DEBIT_MAIL") {
            const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1', [user]);
            const html = `<h1>You have made a transaction.</h1><p>${amount} rupees debited from your wallet</p>`;
            await sendMail(userResult.rows[0].email, "Amount debited", "Amount transferred", html);
        }

        if (job.name === "TRANSFER_CREDIT_MAIL") {
            const userResult = await pool.query('SELECT email FROM users WHERE user_id = $1', [user]);
            const html = `<h1>You have received money in your wallet.</h1><p>${amount} rupees added to your wallet</p>`;
            await sendMail(userResult.rows[0].email, "Amount credited", "Amount transferred", html);
        }
    },
    { connection },
);

worker.on('completed', (job) => { console.log(`Job ${job.id} completed`) });
worker.on('failed', (job, err) => { console.error(`Job ${job.id} failed:`, err) });