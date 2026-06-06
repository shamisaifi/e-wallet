import { transporter } from "../config/mailer.js";

const sendMail = async (to, subject, html) => {
    await transporter.sendMail({
        from: process.env.MAIL_FROM,
        to,
        subject,
        html,
    });
};

// ─── Email Templates ────────────────────────────────────────────────────────

export const sendOtpEmail = async (to, name, otp) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">E-Wallet Verification</h2>
            <p>Hi ${name},</p>
            <p>Your OTP for account verification is:</p>
            <div style="background: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                <h1 style="color: #7C3AED; letter-spacing: 8px; margin: 0;">${otp}</h1>
            </div>
            <p>This OTP expires in <strong>10 minutes</strong>.</p>
            <p>If you did not register, ignore this email.</p>
        </div>
    `;
    await sendMail(to, "Your E-Wallet Verification OTP", html);
};

export const sendWelcomeEmail = async (to, name) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #7C3AED;">Welcome to E-Wallet!</h2>
            <p>Hi ${name},</p>
            <p>Your account has been verified successfully. Your wallet is ready to use.</p>
            <p>You can now deposit, withdraw, and transfer money securely.</p>
        </div>
    `;
    await sendMail(to, "Welcome to E-Wallet!", html);
};

export const sendTransferDebitEmail = async (
    to,
    name,
    amount,
    receiverName,
    newBalance,
) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #DC2626;">Money Sent</h2>
            <p>Hi ${name},</p>
            <p>₹<strong>${amount}</strong> has been debited from your wallet.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; color: #6b7280;">Sent To</td><td style="padding: 8px; font-weight: bold;">${receiverName}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">Amount</td><td style="padding: 8px; font-weight: bold; color: #DC2626;">- ₹${amount}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">New Balance</td><td style="padding: 8px; font-weight: bold;">₹${newBalance}</td></tr>
            </table>
            <p style="color: #6b7280; font-size: 12px;">If you did not make this transaction, contact support immediately.</p>
        </div>
    `;
    await sendMail(to, `₹${amount} sent from your wallet`, html);
};

export const sendTransferCreditEmail = async (
    to,
    name,
    amount,
    senderName,
    newBalance,
) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #16A34A;">Money Received</h2>
            <p>Hi ${name},</p>
            <p>₹<strong>${amount}</strong> has been credited to your wallet.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; color: #6b7280;">Received From</td><td style="padding: 8px; font-weight: bold;">${senderName}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">Amount</td><td style="padding: 8px; font-weight: bold; color: #16A34A;">+ ₹${amount}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">New Balance</td><td style="padding: 8px; font-weight: bold;">₹${newBalance}</td></tr>
            </table>
        </div>
    `;
    await sendMail(to, `₹${amount} received in your wallet`, html);
};

export const sendDepositEmail = async (to, name, amount, newBalance) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #16A34A;">Deposit Successful</h2>
            <p>Hi ${name},</p>
            <p>₹<strong>${amount}</strong> has been added to your wallet.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; color: #6b7280;">Amount Deposited</td><td style="padding: 8px; font-weight: bold; color: #16A34A;">+ ₹${amount}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">New Balance</td><td style="padding: 8px; font-weight: bold;">₹${newBalance}</td></tr>
            </table>
        </div>
    `;
    await sendMail(to, `₹${amount} deposited to your wallet`, html);
};

export const sendWithdrawEmail = async (to, name, amount, newBalance) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
            <h2 style="color: #DC2626;">Withdrawal Successful</h2>
            <p>Hi ${name},</p>
            <p>₹<strong>${amount}</strong> has been withdrawn from your wallet.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr><td style="padding: 8px; color: #6b7280;">Amount Withdrawn</td><td style="padding: 8px; font-weight: bold; color: #DC2626;">- ₹${amount}</td></tr>
                <tr><td style="padding: 8px; color: #6b7280;">New Balance</td><td style="padding: 8px; font-weight: bold;">₹${newBalance}</td></tr>
            </table>
            <p style="color: #6b7280; font-size: 12px;">If you did not make this transaction, contact support immediately.</p>
        </div>
    `;
    await sendMail(to, `₹${amount} withdrawn from your wallet`, html);
};
