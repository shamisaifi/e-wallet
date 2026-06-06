import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

transporter.verify((err) => {
    if (err) {
        console.error("Mailer connection failed:", err.message);
    } else {
        console.log("Mailer ready");
    }
});
