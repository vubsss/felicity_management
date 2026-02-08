const { z } = require('zod');

const errorHandler = (err, req, res, next) => {
    const isZodError = err instanceof z.ZodError;
    const status = err.statusCode || err.status || (isZodError ? 400 : 500);
    const message = isZodError ? 'Validation failed' : err.message || 'Server error';

    return res.status(status).json({ message });
};

module.exports = errorHandler;
