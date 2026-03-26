import { pool } from "../config/db.js";

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

  const client = await pool.connect();

  try {
    const existing = await pool.query(
      "select * from idempotency_keys where key = $1",
      [idempotencyKey],
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
      [senderId],
    );

    if (walletResult.rows[0].balance < amount) {
      throw new Error("Insufficient balance");
    }

    await client.query(
      "update wallets set balance = balance - $1 where user_id = $2 returning balance",
      [amount, senderId],
    );

    await client.query(
      "update wallets set balance = balance + $1 where user_id = $2 returning balance",
      [amount, receiverId],
    );
    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [senderId, receiverId, amount, "transfer", "completed"],
    );

    const idempotencyResult = await client.query(
      "insert into idempotency_keys (key, response) values($1, $2) on conflict (key) do nothing",
      [
        idempotencyKey,
        JSON.stringify({
          success: true,
          message: "money transferred successfully",
        }),
      ],
    );

    if (idempotencyResult.rowCount === 0) {
      await client.query("ROLLBACK");
      const stored = await pool.query(
        "SELECT response FROM idempotency_keys WHERE key = $1",
        [idempotencyKey],
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
      .json({ success: true, message: "money transferes successfuly" });
  } catch (error) {
    await client.query("rollback");
    next(error);
  } finally {
    client.release();
  }
};

export { tranferMoney };
