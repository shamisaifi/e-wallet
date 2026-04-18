import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return next(new ApiError(400, "all fields required"));
  }

  const userExist = await pool.query(
    "select email from users where email = $1",
    [email],
  );

  if (userExist.rows.length > 0) {
    return next(new ApiError(409, "user already exist"));
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const client = await pool.connect();

  try {
    await client.query("begin");

    const newUser = await client.query(
      "insert into users (name, email, password) values($1, $2, $3) returning user_id, name, email",
      [name, email, hashedPassword],
    );

    const newWallet = await client.query(
      "insert into wallets (user_id) values($1) returning wallet_id",
      [newUser.rows[0].user_id],
    );

    await client.query("commit");

    return res.status(201).json({
      success: true,
      message: "user created",
      user: newUser.rows[0],
      wallet_id: newWallet.rows[0].wallet_id,
    });
  } catch (error) {
    await client.query("rollback");
    next(error);
  } finally {
    client.release();
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      throw new ApiError(400, "all fields required");
    }

    const userExist = await pool.query("select * from users where email = $1", [
      email,
    ]);

    if (userExist.rows.length === 0) {
      throw new ApiError(404, "user does not exist");
    }

    const validPassword = await bcrypt.compare(
      password,
      userExist.rows[0]?.password,
    );

    if (!validPassword) {
      throw new ApiError(401, "invalid credentials");
    }

    const payload = {
      userId: userExist.rows[0].user_id,
    };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      success: true,
      message: "logged in",
      token,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

const refesh = async (req, res, next) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return next(new ApiError(404, "refresh token not found"));
  }

  decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  const newRefreshToken = jwt.sign(
    decoded.userId,
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: "7d",
    },
  );

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return res.status(201).json({
    success: true,
    refreshToken: newRefreshToken,
  });
};

export { register, login, refesh };
