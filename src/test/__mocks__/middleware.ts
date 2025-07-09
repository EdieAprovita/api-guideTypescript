import { Request, Response, NextFunction } from 'express';
import { RateLimitRequestHandler } from 'express-rate-limit';
import { testConfig } from '../config/testConfig';

export interface TestUser {
    _id: string;
    role: string;
    email?: string;
}

// Mock para authMiddleware - Centralized and consistent
export const authMiddlewareMocks = {
    protect: jest.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = { _id: 'test-user-id', role: 'user', email: 'test@example.com' };
        next();
    }),
    admin: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    professional: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    requireAuth: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    checkOwnership: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    logout: jest.fn(async (req: Request, res: Response, next: NextFunction) => {
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
        if (next) next();
    }),
    refreshToken: jest.fn(async (req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: { accessToken: testConfig.generateTestPassword(), refreshToken: testConfig.generateTestPassword() },
        });
    }),
    revokeAllTokens: jest.fn(async (req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'All tokens revoked successfully',
        });
    }),
};

// Mock para validation middleware
export const validationMocks = {
    validate: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    sanitizeInput: jest.fn().mockReturnValue([
        (req: Request, res: Response, next: NextFunction) => next(),
        (req: Request, res: Response, next: NextFunction) => next(),
    ]),
    validateInputLength: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    securityHeaders: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    handleValidationError: jest.fn((error: unknown, req: Request, res: Response, next: NextFunction) => next()),
    rateLimits: {
        auth: jest.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        register: jest.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        api: jest.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        search: jest.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
        upload: jest.fn((req: Request, res: Response, next: NextFunction) => next()) as unknown as RateLimitRequestHandler,
    },
};

// Mock para security middleware
export const securityMocks = {
    securityHeaders: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    enforceHTTPS: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    configureHelmet: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    addCorrelationId: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    requireAPIVersion: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    validateUserAgent: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    limitRequestSize: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    detectSuspiciousActivity: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    rateLimits: validationMocks.rateLimits, // Reutilizar los mismos rateLimits
};

// Mock para controladores de usuario (usado en authRoutes)
export const userControllerMocks = {
    refreshToken: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    logout: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    revokeAllTokens: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    registerUser: jest.fn((req: Request, res: Response) => 
        res.status(201).json({ _id: 'userId', firstName: 'John', lastName: 'Doe', email: 'test@example.com' })
    ),
    loginUser: jest.fn((req: Request, res: Response) => 
        res.status(200).json({ token: testConfig.generateTestPassword(), user: { _id: 'userId', email: 'test@example.com' } })
    ),
    forgotPassword: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    resetPassword: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    getUsers: jest.fn((req: Request, res: Response) => 
        res.status(200).json([
            { _id: 'user1', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
            { _id: 'user2', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
        ])
    ),
    getUserById: jest.fn((req: Request, res: Response) => 
        res.status(200).json({ _id: 'user123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' })
    ),
    updateUserProfile: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    getCurrentUserProfile: jest.fn((req: Request, res: Response) => res.status(200).json({ success: true })),
    deleteUserById: jest.fn((req: Request, res: Response) => res.status(200).json('User deleted successfully')),
};