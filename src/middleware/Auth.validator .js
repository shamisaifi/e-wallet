import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    pin: z
        .string()
        .length(4, "PIN must be exactly 4 digits")
        .regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export const verifyOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
    otp: z
        .string()
        .length(6, "OTP must be 6 digits")
        .regex(/^\d{6}$/, "OTP must be digits"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export const resendOtpSchema = z.object({
    email: z.string().email("Invalid email address"),
});
