import { pool } from "../config/db.js";
import ApiError from "../utils/ApiError.js";

// transfer money
const tranferMoney = async (req, res, next) => {
  const idempotencyKey = req.headers["idempotency-key"];

  const { amount } = req.body;
  const { receiverId } = req.params;
  const senderId = req.user.userId;

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency-Key header required",
    });
  }

  try {
    const client = await pool.connect();
    const existing = await pool.query(
      "select * from idempotency_keys where key = $1",
      [idempotencyKey]
    );

    if (existing.rows.length > 0) {
      return res.status(200).json({
        success: true,
        data: existing.rows[0].response,
      });
    }

    await client.query("begin");

    const walletResult = await client.query(
      "select balance from wallets where user_id = $1 for update",
      [senderId]
    );

    if (walletResult.rows[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    await client.query(
      "update wallets set balance = balance - $1 where user_id = $2 returning balance",
      [amount, senderId]
    );

    await client.query(
      "update wallets set balance = balance + $1 where user_id = $2 returning balance",
      [amount, receiverId]
    );
    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [senderId, receiverId, amount, "transfer", "completed"]
    );

    const idempotencyResult = await client.query(
      "insert into idempotency_keys (key, response) values($1, $2) on conflict (key) do nothing",
      [
        idempotencyKey,
        JSON.stringify({
          success: true,
          message: "money transferred successfully",
        }),
      ]
    );

    if (idempotencyResult.rowCount === 0) {
      await client.query("ROLLBACK");
      const stored = await pool.query(
        "SELECT response FROM idempotency_keys WHERE key = $1",
        [idempotencyKey]
      );
      return res.status(200).json({
        success: true,
        message: "money transferred successfully",
        data: stored.rows[0].response,
      });
    }

    await client.query("commit");

    return res
      .status(200)
      .json({ success: true, message: "money transferred successfuly" });
  } catch (error) {
    console.log(error)

    await client.query("rollback");
    next(error);
  } finally {
    await client.release();
  }
};

// deposit money
const deposit = async (req, res, next) => {
  const { amount } = req.body;
  const { userId } = req.user;

  if (!amount) {
    return next(new ApiError(404, "amount is required"));
  }

  if (amount <= 0) {
    return next(new (400, "amount must be greater than 0")());
  }

  try {
    const client = await pool.connect();
    await client.query("begin");
    await client.query(
      "update wallets set balance = balance + $1 where user_id = $2 for update",
      [amount, userId]
    );

    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [6, userId, amount, "deposit", "completed"]
    );

    await client.query("commit");
  } catch (error) {
    console.log(error)

    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [6, userId, amount, "deposit", "failed"]
    );
    await client.query("rollback");
    next(error);
  } finally {
    client.release();
  }
};

// withdraw money
const withdraw = async (req, res, next) => {
  const { amount } = req.body;
  const { userId } = req.user;

  if (!amount) {
    return next(new ApiError(404, "amount is required"));
  }

  if (amount <= 0) {
    return next(new (400, "amount must be greater than 0")());
  }

  try {
    const client = await pool.connect();
    await client.query("begin");

    await client.query(
      "update wallets set amount = amount-$1 where user_id = $2 for update",
      [amount, userId]
    );
    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values($1, $2, $3, $4, $5)",
      [6, userId, amount, "withdraw", "completed"]
    );

    await client.query("commit");
  } catch (error) {
    console.log(error)

    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values($1, $2, $3, $4, $5)",
      [6, userId, amount, "withdraw", "failed"]
    );

    await client.query("rollback");
    next(error);
  } finally {
    await client.release();
  }
};

export { tranferMoney, deposit, withdraw };
