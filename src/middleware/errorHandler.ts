import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../types/Errors.js';
import logger from '../utils/logger.js';

type UnknownError = {
    name?: string;
    message?: string;
    stack?: string;
    code?: number;
    value?: string;
    keyPattern?: Record<string, number>;
    keyValue?: Record<string, string>;
    errors?: Array<{ field: string; message: string }>;
};

interface ErrorResult {
    status: number;
    message: string;
    errorDetail: string;
    validationErrors?: Array<{ field: string; message: string }>;
}

const handleHttpError = (err: HttpError): ErrorResult => ({
    status: err.statusCode,
    message: err.message,
    errorDetail: err.message,
});

const handleStringError = (err: string): ErrorResult => ({
    status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: err,
    errorDetail: 'An error occurred',
});

const handleValidationError = (err: UnknownError): ErrorResult => {
    const validationErrors =
        err.errors?.map(e => {
            if (e && e.field === 'email') {
                return { ...e, message: 'Please enter a valid email address' };
            }
            return e;
        }) || [];

    return {
        status: HttpStatusCode.BAD_REQUEST,
        message: 'Validation Error',
        errorDetail: 'Invalid input data',
        validationErrors,
    };
};

const handleCastError = (err: UnknownError): ErrorResult => ({
    status: HttpStatusCode.BAD_REQUEST,
    message: `Invalid _id: ${err.value}`,
    errorDetail: 'Invalid data format',
});

const handleDuplicateKeyError = (err: UnknownError): ErrorResult => {
    const field = err.keyPattern ? (Object.keys(err.keyPattern)[0] ?? 'field') : 'field';
    return {
        status: HttpStatusCode.BAD_REQUEST,
        message: `Duplicate field value: ${field}`,
        errorDetail: 'Duplicate field value entered',
    };
};

const handleBuiltInError = (err: Error): ErrorResult => {
    if (err instanceof SyntaxError) {
        return {
            status: HttpStatusCode.BAD_REQUEST,
            message: `Syntax Error: ${err.message}`,
            errorDetail: 'Invalid request syntax',
        };
    }

    if (err instanceof RangeError) {
        return {
            status: HttpStatusCode.BAD_REQUEST,
            message: `Range Error: ${err.message}`,
            errorDetail: 'Value out of range',
        };
    }

    return {
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: `Type Error: ${err.message}`,
        errorDetail: 'Internal type error',
    };
};

const handleGenericObjectError = (err: UnknownError): ErrorResult => {
    if (err.name === 'ValidationError' && Array.isArray(err.errors)) {
        return handleValidationError(err);
    }

    if (err.name === 'CastError' && err.value) {
        return handleCastError(err);
    }

    if (err.code === 11000 && err.keyPattern) {
        return handleDuplicateKeyError(err);
    }

    if (err instanceof SyntaxError || err instanceof RangeError || err instanceof TypeError) {
        return handleBuiltInError(err);
    }

    if (err.message) {
        return {
            status: HttpStatusCode.INTERNAL_SERVER_ERROR,
            message: err.message,
            errorDetail: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        };
    }

    return {
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: 'An unknown error occurred',
        errorDetail: 'Unknown error',
    };
};

const processError = (err: unknown): ErrorResult => {
    if (err instanceof HttpError) {
        return handleHttpError(err);
    }

    if (typeof err === 'string') {
        return handleStringError(err);
    }

    if (err && typeof err === 'object') {
        return handleGenericObjectError(err as UnknownError);
    }

    return {
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: 'An unknown error occurred',
        errorDetail: 'Unknown error',
    };
};

export const errorHandler = (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
    if (res.headersSent) return;

    const errorResult = processError(err);

    logger.error('Error Handler:', {
        status: errorResult.status,
        message: errorResult.message,
        name: (err as any)?.name,
        path: req.path,
        method: req.method,
        user: req.user ? req.user._id : 'Guest',
    });

    const response = {
        success: false,
        message: errorResult.message,
        error: errorResult.errorDetail,
        ...(errorResult.validationErrors && { errors: errorResult.validationErrors }),
    };

    res.status(errorResult.status).json(response);
};

export const notFound = (req: Request, res: Response) => {
    res.status(HttpStatusCode.NOT_FOUND).json({ success: false, message: `Not Found - ${req.originalUrl}` });
};
