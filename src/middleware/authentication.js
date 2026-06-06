import jwt from "jsonwebtoken";
import ApiError from "../utils/ApiError.js";

const authenticate = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(new ApiError(401, "Access token required"));
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        req.user = { userId: decoded.userId };
        next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return next(new ApiError(401, "Access token expired"));
        }
        return next(new ApiError(401, "Invalid access token"));
    }
};

export default authenticate;
