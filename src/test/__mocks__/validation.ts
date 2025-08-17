import { vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';

// Type-safe mock for rate limit handler
type MockRateLimitHandler = (req: Request, res: Response, next: NextFunction) => void;

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

export const createRateLimit = vi.fn((): MockRateLimitHandler => {
    return (req: Request, res: Response, next: NextFunction) => {
        next();
    };
});

export const rateLimits = {
    auth: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as MockRateLimitHandler,
    register: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as MockRateLimitHandler,
    api: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as MockRateLimitHandler,
    search: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as MockRateLimitHandler,
    upload: vi.fn((req: Request, res: Response, next: NextFunction) => {
        next();
    }) as MockRateLimitHandler,
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