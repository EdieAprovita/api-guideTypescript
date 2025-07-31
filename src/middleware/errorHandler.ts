import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../types/Errors';
import logger from '../utils/logger';

// Define specific error types for better type safety
interface MongooseValidationError extends Error {
    errors: Record<string, { path: string; message: string }>;
}

interface MongooseCastError extends Error {
    value: string;
    path: string;
}

interface MongooseDuplicateKeyError extends Error {
    code: number;
    keyPattern: Record<string, number>;
}

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error(`[Error] ${req.method} ${req.path}`, {
        error: err.message,
        stack: err.stack,
        user: req.user ? req.user._id : 'Guest',
    });

    // Handle HttpError instances
    if (err instanceof HttpError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            error: err.message,
            errors: err.serializeErrors(),
        });
        return;
    }

    // Handle Mongoose ValidationError
    if (err.name === 'ValidationError') {
        const mongooseErr = err as MongooseValidationError;
        const validationErrors = Object.values(mongooseErr.errors).map((error) => ({
            field: error.path,
            message: error.message,
        }));

        res.status(400).json({
            success: false,
            message: 'Validation Error',
            error: 'Invalid input data',
            errors: validationErrors,
        });
        return;
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        const castError = err as MongooseCastError;
        res.status(400).json({
            success: false,
            message: `Invalid _id: ${castError.value}`,
            error: 'Invalid data format',
        });
        return;
    }

    // Handle Mongoose duplicate key error
    if ((err as MongooseDuplicateKeyError).code === 11000) {
        const duplicateError = err as MongooseDuplicateKeyError;
        const field = Object.keys(duplicateError.keyPattern)[0];
        res.status(400).json({
            success: false,
            message: `Duplicate field value: ${field}`,
            error: 'Duplicate field value entered',
        });
        return;
    }

    // Handle JavaScript built-in errors
    if (err instanceof SyntaxError) {
        res.status(400).json({
            success: false,
            message: `Syntax Error: ${err.message}`,
            error: 'Invalid request syntax',
        });
        return;
    }

    if (err instanceof RangeError) {
        res.status(400).json({
            success: false,
            message: `Range Error: ${err.message}`,
            error: 'Value out of range',
        });
        return;
    }

    if (err instanceof TypeError) {
        res.status(400).json({
            success: false,
            message: `Type Error: ${err.message}`,
            error: 'Internal type error',
        });
        return;
    }

    // Handle string errors
    if (typeof err === 'string') {
        res.status(500).json({
            success: false,
            message: err,
            error: 'An error occurred',
        });
        return;
    }

    // Handle unknown errors
    const statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
    const message = process.env.NODE_ENV === 'development' ? err.message : 'An unknown error occurred';
    const errorMessage = process.env.NODE_ENV === 'development' ? err.message : 'Unknown error';

    res.status(statusCode).json({
        success: false,
        message: message,
        error: errorMessage,
    });
};

export const notFound = (req: Request, res: Response) => {
    const error = new HttpError(HttpStatusCode.NOT_FOUND, `Not Found - ${req.originalUrl}`);
    res.status(error.statusCode).json({
        success: false,
        message: error.message,
        error: error.message,
        errors: error.serializeErrors(),
    });
};
