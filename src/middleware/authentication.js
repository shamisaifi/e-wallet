import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Authentication token missing"));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new ApiError(401, "no token found"));
  }

  try {
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.user = {
      userId: decoded.userId,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export default authenticate;
