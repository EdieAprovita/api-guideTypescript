// Global test setup
import { jest } from '@jest/globals';
import { Request, Response, NextFunction } from 'express';
import { TestUser } from './types';

// Mock environment variables
process.env.NODE_ENV = 'development'; // Changed to development to see real error messages
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.BCRYPT_SALT_ROUNDS = '10';

// Mock database connection - simple and effective
jest.mock('../config/db', () => ({
    __esModule: true,
    default: jest.fn(),
}));

// Mock auth middleware to prevent callback undefined errors
jest.mock('../middleware/authMiddleware', () => ({
    __esModule: true,
    protect: jest.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as Request & { user?: TestUser };
        reqWithUser.user = { _id: 'test-user-id', role: 'user' };
        next();
    }),
    admin: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    professional: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    requireAuth: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
    checkOwnership: jest.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    logout: jest.fn((req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'Logged out successfully',
        });
    }),
    refreshToken: jest.fn((req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: { accessToken: 'mock-token', refreshToken: 'mock-refresh-token' },
        });
    }),
    revokeAllTokens: jest.fn((req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'All tokens revoked successfully',
        });
    }),
}));

// Mock TokenService to prevent Redis connection issues in tests
jest.mock('../services/TokenService', () => ({
    __esModule: true,
    default: {
        generateTokenPair: jest.fn(() =>
            Promise.resolve({
                accessToken: 'mock-access-token',
                refreshToken: 'mock-refresh-token',
            })
        ),
        verifyAccessToken: jest.fn(() =>
            Promise.resolve({
                userId: 'test-user-id',
                email: 'test@example.com',
                role: 'user',
            })
        ),
        verifyRefreshToken: jest.fn(() =>
            Promise.resolve({
                userId: 'test-user-id',
                email: 'test@example.com',
                role: 'user',
            })
        ),
        refreshTokens: jest.fn(() =>
            Promise.resolve({
                accessToken: 'new-access-token',
                refreshToken: 'new-refresh-token',
            })
        ),
        blacklistToken: jest.fn(() => Promise.resolve()),
        revokeAllUserTokens: jest.fn(() => Promise.resolve()),
        isTokenBlacklisted: jest.fn(() => Promise.resolve(false)),
        isUserTokensRevoked: jest.fn(() => Promise.resolve(false)),
    },
}));

// Global test utilities
global.console = {
    ...console,
    // Suppress console.log in tests unless explicitly needed
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

// Setup global test hooks
beforeEach(() => {
    jest.clearAllMocks();
});

afterEach(() => {
    jest.restoreAllMocks();
});
