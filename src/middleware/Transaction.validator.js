import { z } from "zod";

export const depositSchema = z.object({
    amount: z
        .number({ invalid_type_error: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(100000, "Maximum deposit is ₹1,00,000"),
    pin: z
        .string()
        .length(4, "PIN must be 4 digits")
        .regex(/^\d{4}$/, "PIN must be digits"),
});

export const withdrawSchema = z.object({
    amount: z
        .number({ invalid_type_error: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(100000, "Maximum withdrawal is ₹1,00,000"),
    pin: z
        .string()
        .length(4, "PIN must be 4 digits")
        .regex(/^\d{4}$/, "PIN must be digits"),
});

export const transferSchema = z.object({
    amount: z
        .number({ invalid_type_error: "Amount must be a number" })
        .positive("Amount must be greater than 0")
        .max(100000, "Maximum transfer is ₹1,00,000"),
    pin: z
        .string()
        .length(4, "PIN must be 4 digits")
        .regex(/^\d{4}$/, "PIN must be digits"),
});
