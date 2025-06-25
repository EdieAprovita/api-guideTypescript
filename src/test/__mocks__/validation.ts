import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';

export const validate = jest.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
    };
});

export const sanitizeInput = jest.fn().mockReturnValue([
    (req: Request, res: Response, next: NextFunction) => {
        next();
    },
    (req: Request, res: Response, next: NextFunction) => {
        next();
    },
]);

export const createRateLimit = jest.fn(() => {
    return ((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler;
});

export const rateLimits = {
    auth: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    register: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    api: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    search: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    upload: jest.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
};

export const handleValidationError = jest.fn((error: unknown, req: Request, res: Response, next: NextFunction) => {
    next();
});

export const securityHeaders = jest.fn((req: Request, res: Response, next: NextFunction) => {
    next();
});

export const validateInputLength = jest.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
    };
});