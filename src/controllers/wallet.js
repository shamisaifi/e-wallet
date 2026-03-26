import { pool } from "../config/db.js";
import ApiError from "../utils/ApiError.js";

const createWallet = async (req, res, next) => {
  const { userId } = req.user;

  try {
    if (!userId) {
      throw new ApiError(404, "unauthorized");
    }

    const walletExist = await pool.query(
      "select user_id from wallets where user_id = $1",
      [userId],
    );

    if (walletExist.rows.length > 0) {
      throw new ApiError(409, "wallet already exist for this user");
    }

    const walletResult = await pool.query(
      "insert into wallets (user_id) values($1) returning user_id",
      [userId],
    );

    console.log(walletExist.rows[0]);

    res.status(201).json({
      success: true,
      message: "wallet created",
      data: {
        id: walletResult.rows[0].wallet_id,
        user_id: walletResult.rows[0].user_id,
        balance: walletResult.rows[0].balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

export { createWallet };
