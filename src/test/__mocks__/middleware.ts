import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import testConfig from '../testConfig';

export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Mock para authMiddleware - Centralized and consistent
export const authMiddlewareMocks = {
    protect: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            role: 'user',
            email: faker.internet.email(),
        };
        next();
    }),
    admin: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            role: 'admin',
            email: faker.internet.email(),
        };
        next();
    }),
    professional: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            role: 'professional',
            email: faker.internet.email(),
        };
        next();
    }),
    requireAuth: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            role: 'user',
            email: faker.internet.email(),
        };
        next();
    }),
    checkOwnership: vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = {
            _id: faker.database.mongodbObjectId(),
            role: 'user',
            email: faker.internet.email(),
        };
        next();
    }),
    logout: vi.fn(async (req: Request, res: Response, next: NextFunction) => {
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
        if (next) next();
    }),
    refreshToken: vi.fn(async (req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: { accessToken: testConfig.generateTestPassword(), refreshToken: testConfig.generateTestPassword() },
        });
    }),
    revokeAllTokens: vi.fn(async (req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'All tokens revoked successfully',
        });
    }),
};

// Mock para validation middleware
export const validationMocks = {
    validate: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    sanitizeInput: vi
        .fn()
        .mockReturnValue([
            (req: Request, res: Response, next: NextFunction) => next(),
            (req: Request, res: Response, next: NextFunction) => next(),
        ]),
    validateInputLength: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    securityHeaders: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    handleValidationError: vi.fn((error: unknown, req: Request, res: Response, next: NextFunction) => next()),
    rateLimits: {
        auth: vi.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        register: vi.fn((req: Request, res: Response, next: NextFunction) =>
            next()
        ) as unknown as RateLimitRequestHandler,
        api: vi.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        search: vi.fn((req: Request, res: Response, next: NextFunction) =>
            next()
        ) as unknown as RateLimitRequestHandler,
        upload: vi.fn((req: Request, res: Response, next: NextFunction) =>
            next()
        ) as unknown as RateLimitRequestHandler,
    },
};

// Mock para security middleware
export const securityMocks = {
    securityHeaders: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    enforceHTTPS: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    configureHelmet: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    addCorrelationId: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    requireAPIVersion: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    validateUserAgent: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    limitRequestSize: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    detectSuspiciousActivity: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    rateLimits: validationMocks.rateLimits, // Reutilizar los mismos rateLimits
};

// Mock para controladores de usuario (usado en authRoutes)
export const userControllerMocks = {
    refreshToken: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    logout: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    revokeAllTokens: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    registerUser: vi.fn((req: Request, res: Response) =>
        res.status(201).json({
            _id: faker.database.mongodbObjectId(),
            firstName: 'John',
            lastName: 'Doe',
            email: 'faker.internet.email()',
        })
    ),
    loginUser: vi.fn((req: Request, res: Response) =>
        res.status(200).json({
            token: testConfig.generateTestPassword(),
            user: { _id: faker.database.mongodbObjectId(), email: 'faker.internet.email()' },
        })
    ),
    forgotPassword: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    resetPassword: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    getUsers: vi.fn((req: Request, res: Response) =>
        res.status(200).json([
            { _id: faker.database.mongodbObjectId(), firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { _id: faker.database.mongodbObjectId(), firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        ])
    ),
    getUserById: vi.fn((req: Request, res: Response) =>
        res.status(200).json({
            _id: faker.database.mongodbObjectId(),
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
        })
    ),
    updateUserProfile: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    getCurrentUserProfile: vi.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    deleteUserById: vi.fn((req: Request, res: Response) => res.status(200).json('User deleted successfully')),
};
