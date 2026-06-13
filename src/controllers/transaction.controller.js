import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { getCache, setCache, deleteCache } from "../utils/cache.js";
import { aquireLock, releaseLock } from "../utils/lock.js";
import { addNotificationJob } from "../queues/notification.queue.js";

// ─── Verify Transaction PIN ───────────────────────────────────────────────────

const verifyPin = async (userId, pin) => {
    const result = await pool.query(
        "SELECT pin FROM users WHERE user_id = $1",
        [userId],
    );

    if (result.rows.length === 0) return false;
    return bcrypt.compare(pin, result.rows[0].pin);
};

// ─── Check Balance ────────────────────────────────────────────────────────────

export const checkBalance = async (req, res, next) => {
    const { userId } = req.user;

    try {
        const cacheKey = `balance:${userId}`;
        const cached = await getCache(cacheKey);

        if (cached) {
            return res.status(200).json(
                new ApiResponse(200, "Wallet balance", {
                    ...cached,
                    source: "cache",
                }),
            );
        }

        const result = await pool.query(
            "SELECT wallet_id, balance FROM wallets WHERE user_id = $1",
            [userId],
        );

        if (result.rows.length === 0) {
            return next(new ApiError(404, "Wallet not found"));
        }

        const walletData = result.rows[0];
        await setCache(cacheKey, walletData);

        return res
            .status(200)
            .json(new ApiResponse(200, "Wallet balance", walletData));
    } catch (err) {
        next(err);
    }
};

// ─── Deposit ──────────────────────────────────────────────────────────────────

export const deposit = async (req, res, next) => {
    const { userId } = req.user;
    const { amount, pin } = req.body;

    try {
        const pinValid = await verifyPin(userId, pin);
        if (!pinValid) {
            return next(new ApiError(403, "Incorrect transaction PIN"));
        }
    } catch (err) {
        return next(err);
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
            [amount, userId],
        );

        await client.query(
            "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
            [userId, userId, amount, "deposit", "completed"],
        );

        const newBalanceResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [userId],
        );

        await client.query("COMMIT");

        const newBalance = newBalanceResult.rows[0].balance;

        // Update cache with fresh balance
        await setCache(`balance:${userId}`, { balance: newBalance });

        // Fire email job — non-blocking
        await addNotificationJob("DEPOSIT_SUCCESS", {
            userId,
            amount,
            newBalance,
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "Deposit successful", { newBalance }));
    } catch (err) {
        await client.query("ROLLBACK");

        // Log failed transaction independently
        await pool
            .query(
                "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
                [userId, userId, amount, "deposit", "failed"],
            )
            .catch((e) =>
                console.error("Failed to log failed deposit:", e.message),
            );

        next(err);
    } finally {
        client.release();
    }
};

// ─── Withdraw ─────────────────────────────────────────────────────────────────

export const withdraw = async (req, res, next) => {
    const { userId } = req.user;
    const { amount, pin } = req.body;

    try {
        const pinValid = await verifyPin(userId, pin);
        if (!pinValid) {
            return next(new ApiError(403, "Incorrect transaction PIN"));
        }
    } catch (err) {
        return next(err);
    }

    // Check balance before acquiring lock
    try {
        const balanceResult = await pool.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [userId],
        );

        if (balanceResult.rows.length === 0) {
            return next(new ApiError(404, "Wallet not found"));
        }

        if (parseFloat(balanceResult.rows[0].balance) < amount) {
            return next(new ApiError(400, "Insufficient balance"));
        }
    } catch (err) {
        return next(err);
    }

    const client = await pool.connect();
    const lockKey = `lock:wallet:${userId}`;
    let lockAcquired = false;

    try {
        const lock = await aquireLock(lockKey, 10);
        if (!lock) {
            return next(
                new ApiError(
                    409,
                    "Another transaction is in progress. Please try again.",
                ),
            );
        }
        lockAcquired = true;

        await client.query("BEGIN");

        // Re-check balance inside lock with FOR UPDATE to prevent race condition
        const walletResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
            [userId],
        );

        if (parseFloat(walletResult.rows[0].balance) < amount) {
            throw new ApiError(400, "Insufficient balance");
        }

        await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
            [amount, userId],
        );

        await client.query(
            "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
            [userId, userId, amount, "withdraw", "completed"],
        );

        const newBalanceResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1",
            [userId],
        );

        await client.query("COMMIT");

        const newBalance = newBalanceResult.rows[0].balance;

        await setCache(`balance:${userId}`, { balance: newBalance });
        await addNotificationJob("WITHDRAW_SUCCESS", {
            userId,
            amount,
            newBalance,
        });

        return res
            .status(200)
            .json(
                new ApiResponse(200, "Withdrawal successful", { newBalance }),
            );
    } catch (err) {
        await client.query("ROLLBACK");

        await pool
            .query(
                "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
                [userId, userId, amount, "withdraw", "failed"],
            )
            .catch((e) =>
                console.error("Failed to log failed withdrawal:", e.message),
            );

        next(err);
    } finally {
        if (lockAcquired) await releaseLock(lockKey);
        client.release();
    }
};

// ─── Transfer ─────────────────────────────────────────────────────────────────

export const transfer = async (req, res, next) => {
    const idempotencyKey = req.headers["idempotency-key"];
    const { userId: senderId } = req.user;
    const { receiverId } = req.params;
    const { amount, pin } = req.body;

    if (!idempotencyKey) {
        return next(new ApiError(400, "Idempotency-Key header is required"));
    }

    if (String(senderId) === String(receiverId)) {
        return next(new ApiError(400, "Cannot transfer to yourself"));
    }

    // Verify PIN before any DB work
    try {
        const pinValid = await verifyPin(senderId, pin);
        if (!pinValid) {
            return next(new ApiError(403, "Incorrect transaction PIN"));
        }
    } catch (err) {
        return next(err);
    }

    // Check idempotency key — if seen before, return stored result
    try {
        const existing = await pool.query(
            "SELECT response FROM idempotency_keys WHERE key = $1",
            [idempotencyKey],
        );

        if (existing.rows.length > 0) {
            return res.status(200).json({
                success: true,
                message: "Duplicate request — returning cached result",
                data: existing.rows[0].response,
                idempotent: true,
            });
        }
    } catch (err) {
        return next(err);
    }

    // Validate receiver exists
    try {
        const receiverResult = await pool.query(
            "SELECT user_id FROM users WHERE user_id = $1 AND is_verified = TRUE",
            [receiverId],
        );

        if (receiverResult.rows.length === 0) {
            return next(new ApiError(404, "Receiver not found"));
        }
    } catch (err) {
        return next(err);
    }

    const client = await pool.connect();
    const lockKey = `lock:wallet:${senderId}`;
    let lockAcquired = false;

    try {
        const lock = await aquireLock(lockKey, 10);
        if (!lock) {
            return next(
                new ApiError(
                    409,
                    "Another transaction is in progress. Please try again.",
                ),
            );
        }
        lockAcquired = true;

        await client.query("BEGIN");

        // Lock sender wallet row — prevents concurrent modification
        const walletResult = await client.query(
            "SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE",
            [senderId],
        );

        if (walletResult.rows.length === 0) {
            throw new ApiError(404, "Sender wallet not found");
        }

        if (parseFloat(walletResult.rows[0].balance) < amount) {
            throw new ApiError(400, "Insufficient balance");
        }

        // Debit sender
        await client.query(
            "UPDATE wallets SET balance = balance - $1 WHERE user_id = $2",
            [amount, senderId],
        );

        // Credit receiver
        await client.query(
            "UPDATE wallets SET balance = balance + $1 WHERE user_id = $2",
            [amount, receiverId],
        );

        // Log transaction
        await client.query(
            "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
            [senderId, receiverId, amount, "transfer", "completed"],
        );

        // Store idempotency key with response
        const idempotencyResponse = {
            success: true,
            message: "Transfer successful",
        };
        const idempotencyResult = await client.query(
            "INSERT INTO idempotency_keys (key, response) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING",
            [idempotencyKey, JSON.stringify(idempotencyResponse)],
        );

        // If rowCount is 0, another concurrent request already committed with same key
        if (idempotencyResult.rowCount === 0) {
            await client.query("ROLLBACK");
            const stored = await pool.query(
                "SELECT response FROM idempotency_keys WHERE key = $1",
                [idempotencyKey],
            );
            return res.status(200).json({
                success: true,
                message: "Duplicate request — returning cached result",
                data: stored.rows[0].response,
                idempotent: true,
            });
        }

        // Fetch updated balances for cache and email
        const [senderBalanceResult, receiverBalanceResult] = await Promise.all([
            client.query("SELECT balance FROM wallets WHERE user_id = $1", [
                senderId,
            ]),
            client.query("SELECT balance FROM wallets WHERE user_id = $1", [
                receiverId,
            ]),
        ]);

        await client.query("COMMIT");

        const senderNewBalance = senderBalanceResult.rows[0].balance;
        const receiverNewBalance = receiverBalanceResult.rows[0].balance;

        // Update caches
        await Promise.all([
            setCache(`balance:${senderId}`, { balance: senderNewBalance }),
            setCache(`balance:${receiverId}`, { balance: receiverNewBalance }),
        ]);

        // Queue email notifications — non-blocking
        await Promise.all([
            addNotificationJob("TRANSFER_DEBIT", {
                senderId,
                receiverId,
                amount,
                senderNewBalance,
            }),
            addNotificationJob("TRANSFER_CREDIT", {
                senderId,
                receiverId,
                amount,
                receiverNewBalance,
            }),
        ]);

        return res.status(200).json(
            new ApiResponse(200, "Transfer successful", {
                amount,
                newBalance: senderNewBalance,
            }),
        );
    } catch (err) {
        await client.query("ROLLBACK");

        // Log failed transaction on a fresh pool connection — not the aborted client
        await pool
            .query(
                "INSERT INTO transactions (sender_id, receiver_id, amount, type, status) VALUES ($1, $2, $3, $4, $5)",
                [senderId, receiverId, amount, "transfer", "failed"],
            )
            .catch((e) =>
                console.error("Failed to log failed transfer:", e.message),
            );

        next(err);
    } finally {
        if (lockAcquired) await releaseLock(lockKey);
        client.release();
    }
};

// ─── Transaction History ──────────────────────────────────────────────────────

export const transactionHistory = async (req, res, next) => {
    const { userId } = req.user;
    const { page = 1, limit = 10, type = "all", status = "all" } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit))); // max 50 per page
    const offset = (pageNum - 1) * limitNum;

    try {
        // Build dynamic query based on filters
        let whereClause = "(sender_id = $1 OR receiver_id = $2)";
        const queryParams = [userId, userId];
        let paramIndex = 3;

        if (type !== "all") {
            whereClause += ` AND type = $${paramIndex}`;
            queryParams.push(type);
            paramIndex++;
        }

        if (status !== "all") {
            whereClause += ` AND status = $${paramIndex}`;
            queryParams.push(status);
            paramIndex++;
        }

        const [historyResult, countResult] = await Promise.all([
            pool.query(
                `SELECT * FROM transactions WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
                [...queryParams, limitNum, offset],
            ),
            pool.query(
                `SELECT COUNT(*) FROM transactions WHERE ${whereClause}`,
                queryParams,
            ),
        ]);

        const total = parseInt(countResult.rows[0].count);
        const totalPages = Math.ceil(total / limitNum);

        return res.status(200).json(
            new ApiResponse(200, "Transaction history", {
                transactions: historyResult.rows,
                pagination: {
                    total,
                    totalPages,
                    currentPage: pageNum,
                    limit: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1,
                },
            }),
        );
    } catch (err) {
        next(err);
    }
};
