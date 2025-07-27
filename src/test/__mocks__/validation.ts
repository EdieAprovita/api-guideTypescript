import { vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';

export const validate = vi.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
    };
});

export const sanitizeInput = vi.fn().mockReturnValue([
    (req: Request, res: Response, next: NextFunction) => {
        next();
    },
    (req: Request, res: Response, next: NextFunction) => {
        next();
    },
]);

export const createRateLimit = vi.fn(() => {
    return ((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler;
});

export const rateLimits = {
    auth: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    register: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    api: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    search: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
    upload: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as unknown as RateLimitRequestHandler,
};

export const handleValidationError = vi.fn((error: unknown, req: Request, res: Response, next: NextFunction) => {
    next();
});

export const securityHeaders = vi.fn((req: Request, res: Response, next: NextFunction) => {
    next();
});

export const validateInputLength = vi.fn(() => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
    };
});