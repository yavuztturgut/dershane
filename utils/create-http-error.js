function createHttpError(message, statusCode, errorCode) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.errorCode = errorCode;
    return error;
}

module.exports = createHttpError;
