import ApiError from "../utils/ApiError.js";

export const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
        const message = result.error.errors[0]?.message || "Validation failed";
        return next(new ApiError(400, message));
    }

    // Replace req.body with parsed/coerced values
    req.body = result.data;
    next();
};
