import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode, TokenRevokedError } from '../types/Errors.js';
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

const isProduction = (): boolean => process.env.NODE_ENV === 'production';

const GENERIC_INTERNAL_MESSAGE = 'An internal error occurred. Please try again later.';
const GENERIC_INTERNAL_DETAIL = 'Internal server error';

// HttpError carve-out: intentional 4xx errors (400/401/403/404) are developer-authored
// and MUST preserve their message client-side. They never leak internals.
const handleHttpError = (err: HttpError): ErrorResult => ({
    status: err.statusCode,
    message: err.message,
    errorDetail: err.message,
});

const handleStringError = (err: string): ErrorResult => ({
    status: HttpStatusCode.INTERNAL_SERVER_ERROR,
    message: isProduction() ? GENERIC_INTERNAL_MESSAGE : err,
    errorDetail: isProduction() ? GENERIC_INTERNAL_DETAIL : 'An error occurred',
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

const handleCastError = (err: UnknownError): ErrorResult => {
    const prod = isProduction();
    return {
        status: HttpStatusCode.BAD_REQUEST,
        message: prod ? 'Invalid resource identifier' : `Invalid _id: ${err.value}`,
        errorDetail: prod ? 'Bad request' : 'Invalid data format',
    };
};

const handleDuplicateKeyError = (err: UnknownError): ErrorResult => {
    const field = err.keyPattern ? (Object.keys(err.keyPattern)[0] ?? 'field') : 'field';
    const prod = isProduction();
    return {
        status: HttpStatusCode.CONFLICT,
        message: prod ? 'Duplicate entry' : `Duplicate field value: ${field}`,
        errorDetail: prod ? 'Conflict' : 'Duplicate field value entered',
    };
};

const handleBuiltInError = (err: Error): ErrorResult => {
    const prod = isProduction();

    if (err instanceof SyntaxError) {
        return {
            status: HttpStatusCode.BAD_REQUEST,
            message: prod ? 'Invalid request syntax' : `Syntax Error: ${err.message}`,
            errorDetail: prod ? 'Bad request' : 'Invalid request syntax',
        };
    }

    if (err instanceof RangeError) {
        return {
            status: HttpStatusCode.BAD_REQUEST,
            message: prod ? 'Value out of range' : `Range Error: ${err.message}`,
            errorDetail: prod ? 'Bad request' : 'Value out of range',
        };
    }

    return {
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: prod ? GENERIC_INTERNAL_MESSAGE : `Type Error: ${err.message}`,
        errorDetail: prod ? GENERIC_INTERNAL_DETAIL : 'Internal type error',
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
        const prod = isProduction();
        return {
            status: HttpStatusCode.INTERNAL_SERVER_ERROR,
            message: prod ? GENERIC_INTERNAL_MESSAGE : err.message,
            errorDetail: prod ? GENERIC_INTERNAL_DETAIL : err.message,
        };
    }

    return {
        status: HttpStatusCode.INTERNAL_SERVER_ERROR,
        message: 'An unknown error occurred',
        errorDetail: 'Unknown error',
    };
};

const isTokenRevokedError = (err: unknown): boolean => {
    return err instanceof TokenRevokedError;
};

const processError = (err: unknown): ErrorResult => {
    if (isTokenRevokedError(err)) {
        return {
            status: HttpStatusCode.UNAUTHORIZED,
            message: 'Token has been revoked',
            errorDetail:
                process.env.NODE_ENV === 'production' ? 'Authentication failed' : 'Token revoked — authenticate again',
        };
    }

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

    // Preserve original error details in server-side logs for diagnostics.
    // These fields are NEVER sent to the client — the sanitized response
    // is built separately below from errorResult.
    const correlationId =
        (req as unknown as { id?: string }).id ??
        (req.headers['x-correlation-id'] as string | undefined) ??
        (req.headers['x-request-id'] as string | undefined);

    logger.error('Error Handler:', {
        status: errorResult.status,
        name: err instanceof Error ? err.name : (err as { name?: string } | null)?.name,
        // Original, un-sanitized error message for SRE diagnostics
        originalMessage: err instanceof Error ? err.message : typeof err === 'string' ? err : JSON.stringify(err),
        // Full stack trace — always logged server-side (logs are not client-exposed)
        stack: err instanceof Error ? err.stack : undefined,
        path: req.path,
        method: req.method,
        requestId: correlationId,
        userId: req.user?._id?.toString() ?? 'Guest',
        // Sanitized message that was actually sent to the client (audit trail)
        clientMessage: errorResult.message,
    });

    // TODO(observability): hook Sentry.captureException(err, { extra: { requestId, path } })
    // once @sentry/node is wired up so we have post-mortem APM in production.

    const response = {
        success: false,
        message: errorResult.message,
        error: errorResult.errorDetail,
        ...(errorResult.validationErrors && { errors: errorResult.validationErrors }),
    };

    res.status(errorResult.status).json(response);
};

export const notFound = (_req: Request, res: Response) => {
    res.status(HttpStatusCode.NOT_FOUND).json({ success: false, message: 'Resource not found' });
};
