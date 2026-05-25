import nodemailer from "nodemailer";

export const tranporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: "shamisaifi2003@gmail.com",
        pass: "zggo edqd apkr zyus",
    },
});

export async function sendMail(to, subject, text, html) {
    try {
        const info = await tranporter.sendMail({
            from: process.env.MAIL,
            to: to,
            subject: subject,
            text: text,
            html: html,
        });

        console.log("mail sent");
    } catch (error) {
        console.error("Error while sending mail:", error);
    }
}
