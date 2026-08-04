function createHttpError(message, statusCode, errorCode, details) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    error.details = details;
    return error;
}

module.exports = createHttpError;
