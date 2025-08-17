import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../types/Errors';
import logger from '../utils/logger';

type UnknownError = unknown & {
    name?: string;
    message?: string;
    stack?: string;
    code?: number;
    value?: string;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, string>;
    errors?: Array<{ field: string; message: string }>;
};

export const errorHandler = (err: UnknownError, req: Request, res: Response, _next: NextFunction): void => {
    if (res.headersSent) return; // Do not modify response if already sent

    let status = HttpStatusCode.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetail: string | undefined = 'Unknown error';
    let validationErrors: Array<{ field: string; message: string }> | undefined;

    // Map known error types
    if (err instanceof HttpError) {
        status = err.statusCode;
        message = err.message;
        errorDetail = err.message;
    } else if (typeof err === 'string') {
        status = HttpStatusCode.INTERNAL_SERVER_ERROR;
        message = err;
        errorDetail = 'An error occurred';
    } else if (err && typeof err === 'object') {
        // Mongoose - ValidationError
        if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
            status = HttpStatusCode.BAD_REQUEST;
            message = 'Validation Error';
            errorDetail = 'Invalid input data';
            // Standardize validation error messages to keep API consistent
            validationErrors = err.errors.map(e => {
                if (e && e.field === 'email') {
                    return { ...e, message: 'Please enter a valid email address' };
                }
                return e;
            });
        }
        // Mongoose - CastError
        else if (err.name === 'CastError' && err.value) {
            status = HttpStatusCode.BAD_REQUEST;
            message = `Invalid _id: ${err.value}`;
            errorDetail = 'Invalid data format';
        }
        // Mongo duplicate key
        else if (err.code === 11000 && err.keyPattern) {
            const field = Object.keys(err.keyPattern)[0] ?? 'field';
            status = HttpStatusCode.BAD_REQUEST;
            message = `Duplicate field value: ${field}`;
            errorDetail = 'Duplicate field value entered';
        }
        // Built-in errors
        else if (err instanceof SyntaxError) {
            status = HttpStatusCode.BAD_REQUEST;
            message = `Syntax Error: ${err.message}`;
            errorDetail = 'Invalid request syntax';
        } else if (err instanceof RangeError) {
            status = HttpStatusCode.BAD_REQUEST;
            message = `Range Error: ${err.message}`;
            errorDetail = 'Value out of range';
        } else if (err instanceof TypeError) {
            status = HttpStatusCode.INTERNAL_SERVER_ERROR;
            message = `Type Error: ${err.message}`;
            errorDetail = 'Internal type error';
        } else if (err.message) {
            status = HttpStatusCode.INTERNAL_SERVER_ERROR;
            message = err.message;
            errorDetail = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
        } else {
            status = HttpStatusCode.INTERNAL_SERVER_ERROR;
            message = 'An unknown error occurred';
            errorDetail = 'Unknown error';
        }
    } else {
        status = HttpStatusCode.INTERNAL_SERVER_ERROR;
        message = 'An unknown error occurred';
        errorDetail = 'Unknown error';
    }

    // Log
    logger.error('Error Handler:', {
        status,
        message,
        name: (err as any)?.name,
        path: req.path,
        method: req.method,
        user: req.user ? req.user._id : 'Guest',
    });

    if (validationErrors) {
        res.status(status).json({ success: false, message, error: errorDetail, errors: validationErrors });
        return;
    }

    res.status(status).json({ success: false, message, error: errorDetail });
};

export const notFound = (req: Request, res: Response) => {
    res.status(HttpStatusCode.NOT_FOUND).json({ success: false, message: `Not Found - ${req.originalUrl}` });
};
