import { pool } from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const register = async (req, res, next) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      throw new ApiError(400, "all fields required");
    }

    const userExist = await pool.query(
      "select email from users where email = $1",
      [email],
    );

    if (userExist.rows.length > 0) {
      throw new ApiError(409, "user already exist");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await pool.query(
      "insert into users (name, email, password) values($1, $2, $3) returning name, email",
      [name, email, hashedPassword],
    );

    return res.status(201).json({
      success: true,
      message: "user created",
      user: newUser.rows[0],
    });
  } catch (error) {
    next(error);
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

    const refresToken = jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
      expiresIn: "7d",
    });

    res.cookie("refreshToken", refresToken, {
      httpOnly: true,
      secure: true,
      samesite: "strict",
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

export { register, login };
