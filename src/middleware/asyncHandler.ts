import { Request, Response, NextFunction } from 'express';
import { HttpError } from '../types/Errors';

type AsyncMiddleware = (req: Request, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncMiddleware): AsyncMiddleware => {
    return (req, res, next): Promise<void> => {
        return Promise.resolve(fn(req, res, next)).catch((error) => {
            // If it's already an HttpError, pass it directly
            if (error instanceof HttpError) {
                return next(error);
            }
            // Otherwise, wrap it in an HttpError
            const httpError = new HttpError(
                error.statusCode || 500,
                error.message || 'Internal Server Error'
            );
            return next(httpError);
        });
    };
};

export default asyncHandler;
