import { pool } from "../config/db.js";
import ApiError from "../utils/ApiError.js";

const checkBalance = async (req, res, next) => {
  const userId = req.user.userId;

  if (!userId) {
    return next(new ApiError(404, "user id undefined"));
  }

  try {
    const wallet_data = await pool.query(
      "select * from wallets where user_id = $1",
      [userId],
    );

    if (wallet_data.rows[0].length <= 0) {
      return next(new ApiError(404, "no record found"));
    }
    console.log("user data: ", wallet_data.rows[0]);

    return res.status(200).json({
      success: true,
      message: "wallet balance",
      data: wallet_data.rows[0],
    });
  } catch (error) {
    next(error);
  }
};

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
      const stored = await pool.query(
        "SELECT response FROM idempotency_keys WHERE key = $1",
        [idempotencyKey],
      );
      await client.query("ROLLBACK");
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
    console.log(error);

    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [senderId, receiverId, amount, "deposit", "failed"],
    );

    await pool.query("rollback");

    next(error);
  } finally {
    client.release();
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
    return next(new ApiError(400, "amount must be greater than 0")());
  }

  const client = await pool.connect();

  try {
    await client.query("begin");
    await client.query(
      "update wallets set balance = balance + $1 where user_id = $2",
      [amount, userId],
    );

    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [userId, userId, amount, "deposit", "completed"],
    );

    await client.query("commit");

    return res
      .status(200)
      .json({ success: true, message: "deposit successful" });
  } catch (error) {
    console.log(error);

    await pool.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values ($1, $2, $3, $4, $5)",
      [6, userId, amount, "deposit", "failed"],
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
    return next(new ApiError(400, "amount must be greater than 0")());
  }

  try {
    const balance = await pool.query(
      "select balance from wallets where user_id = $1",
      [userId],
    );
    console.log("balance: ", balance.rows[0].balance < amount);

    if (balance.rows[0].balance < amount) {
      return next(new ApiError(400, "low available balance"));
    }
  } catch (err) {
    console.log(err);
    next(err);
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(
      "update wallets set balance = balance-$1 where user_id = $2",
      [amount, userId],
    );
    await client.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values($1, $2, $3, $4, $5)",
      [userId, userId, amount, "withdraw", "completed"],
    );

    await client.query("commit");

    return res
      .status(200)
      .json({ success: true, message: "withdraw successful" });
  } catch (error) {
    console.log(error);

    await pool.query(
      "insert into transactions (sender_id, receiver_id, amount, type, status) values($1, $2, $3, $4, $5)",
      [6, userId, amount, "withdraw", "failed"],
    );

    await client.query("rollback");

    next(error);
  } finally {
    client.release();
  }
};

const transactionHistory = async (req, res, next) => {
  const { userId } = req.user;
  const {
    limit = 10,
    page = 0,
    type = "all",
    status = "all",
    start_range,
    end_range,
  } = req.query;

  const skip = page > 0 ? ((page - 1) * limit) : 0;
  console.log(userId, limit, page, skip);

  if (!userId) {
    return next(new ApiError(403, "user id undefined"));
  }

  try {
    const history = await pool.query(
      `select * from transactions where sender_id = $1 or receiver_id = $2 order by created_at desc offset $3 limit $4`,
      [userId, userId, skip, limit],
    );

    if (!history) {
      return next(new ApiError(500, "something went wrong!"));
    }

    console.log("history: ", history);

    return res.json({
      success: true,
      message: 'transaction history',
      data: history
    })
  } catch (error) {
    next(error);
  }
};

export { checkBalance, tranferMoney, deposit, withdraw, transactionHistory };
