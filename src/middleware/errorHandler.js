const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal server error";

    const response = {
        success: false,
        message,
    };

    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

export default errorHandler;
