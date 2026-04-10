import { Request, Response, NextFunction } from 'express';

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Wraps an async route handler so uncaught rejections are forwarded to Express's
 * error pipeline AS-IS. This preserves error.name / error.code so that the global
 * errorHandler can branch on Mongoose error types (ValidationError, CastError,
 * duplicate key 11000) instead of receiving a generic HttpError wrapper.
 */
const asyncHandler = (fn: AsyncMiddleware): AsyncMiddleware => {
    return (req, res, next): Promise<void> => {
        return Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncHandler;
