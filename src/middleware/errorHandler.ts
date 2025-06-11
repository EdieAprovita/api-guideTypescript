import { Request, Response, NextFunction } from 'express';
import { HttpError, HttpStatusCode } from '../types/Errors';
import logger from '../utils/logger';

export const errorHandler = (err: Error, req: Request, res: Response, _next: NextFunction): void => {
    logger.error(`[Error] ${req.method} ${req.path}`, {
        error: err.message,
        stack: err.stack,
        user: req.user ? req.user._id : 'Guest',
    });

    if (err instanceof HttpError) {
    } else {
        const statusCode = HttpStatusCode.INTERNAL_SERVER_ERROR;
        res.status(statusCode).json({
            errors: [
                {
                    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
                },
            ],
        });
    }
};

export const notFound = (req: Request, res: Response) => {
    const error = new HttpError(HttpStatusCode.NOT_FOUND, `Not Found - ${req.originalUrl}`);
    res.status(error.statusCode).json({ errors: error.serializeErrors() });
};
