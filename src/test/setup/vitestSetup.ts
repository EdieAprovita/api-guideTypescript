// Global test setup for Vitest - Centralized and optimized
import { vi, beforeEach, afterEach } from 'vitest';
import { faker } from '@faker-js/faker';
import { Request, Response, NextFunction } from 'express';
import { generateTestPassword } from '../utils/passwordGenerator';

// Set faker seed for consistent test results
faker.seed(12345);

// Mock environment variables with faker-generated values
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = generateTestPassword();
process.env.BCRYPT_SALT_ROUNDS = '10';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/test-db';
process.env.REDIS_HOST = '127.0.0.1';
process.env.REDIS_PORT = '6379';

// === CRITICAL: Mocks must be defined BEFORE any imports ===

// Mock database connection first - prevents connection attempts
vi.mock('../../config/db', () => ({
    __esModule: true,
    default: vi.fn().mockResolvedValue(undefined),
}));

// Mock bcryptjs with proper ESM structure
vi.mock('bcryptjs', () => ({
    __esModule: true,
    default: {
        hash: vi.fn().mockResolvedValue('hashed_password'),
        compare: vi.fn().mockResolvedValue(true),
        genSalt: vi.fn().mockResolvedValue('salt'),
    },
    hash: vi.fn().mockResolvedValue('hashed_password'),
    compare: vi.fn().mockResolvedValue(true),
    genSalt: vi.fn().mockResolvedValue('salt'),
}));

// Only mock JWT for unit tests, not integration tests
if (!process.env.INTEGRATION_TEST) {
    // Mock JWT for token generation
    vi.mock('jsonwebtoken', () => ({
        __esModule: true,
        default: {
            sign: vi.fn().mockReturnValue('mock_token'),
            verify: vi.fn().mockReturnValue({
                userId: 'user123',
                email: 'test@example.com',
                role: 'user',
            }),
            decode: vi.fn().mockReturnValue({
                userId: 'user123',
                email: 'test@example.com',
                role: 'user',
            }),
        },
        sign: vi.fn().mockReturnValue('mock_token'),
        verify: vi.fn().mockReturnValue({
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
        }),
        decode: vi.fn().mockReturnValue({
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
        }),
    }));
}

// Mock Redis for caching
vi.mock('ioredis', () => ({
    __esModule: true,
    default: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn().mockResolvedValue('OK'),
        setex: vi.fn().mockResolvedValue('OK'),
        del: vi.fn().mockResolvedValue(1),
        exists: vi.fn().mockResolvedValue(0),
        expire: vi.fn().mockResolvedValue(1),
        ttl: vi.fn().mockResolvedValue(-1),
        keys: vi.fn().mockResolvedValue([]),
        flushdb: vi.fn().mockResolvedValue('OK'),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        on: vi.fn(),
        off: vi.fn(),
        ping: vi.fn().mockResolvedValue('PONG'),
        info: vi.fn().mockResolvedValue('redis_version:6.0.0'),
        memory: vi.fn().mockResolvedValue({ used_memory: 1024 }),
    })),
}));

// Create test user helper
interface TestUser {
    _id: string;
    email: string;
    username: string;
    role: 'user' | 'professional' | 'admin';
    isActive: boolean;
    isDeleted: boolean;
    firstName: string;
    lastName: string;
    photo: string;
    createdAt: Date;
    updatedAt: Date;
    isAdmin?: boolean;
}

const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => ({
    _id: faker.database.mongodbObjectId(),
    email: faker.internet.email(),
    username: faker.internet.userName(),
    role: 'user' as const,
    isActive: true,
    isDeleted: false,
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    photo: faker.image.avatar(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

// Mock authentication middleware with proper user setup
interface RequestWithUser extends Request {
    user?: TestUser;
}

vi.mock('../../middleware/authMiddleware', () => ({
    protect: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as RequestWithUser;
        reqWithUser.user = createTestUser();
        next();
    }),
    admin: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as RequestWithUser;
        reqWithUser.user = createTestUser({ role: 'admin', isAdmin: true });
        next();
    }),
    professional: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as RequestWithUser;
        reqWithUser.user = createTestUser({ role: 'professional' });
        next();
    }),
    requireAuth: vi.fn((req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as RequestWithUser;
        reqWithUser.user = createTestUser();
        next();
    }),
    checkOwnership: vi.fn(() => (req: Request, res: Response, next: NextFunction) => {
        const reqWithUser = req as RequestWithUser;
        reqWithUser.user = createTestUser();
        next();
    }),
    logout: vi.fn(async (req: Request, res: Response, next: NextFunction) => {
        res.json({ success: true, message: 'Logged out successfully' });
        if (next) next();
    }),
    refreshToken: vi.fn(async (req: Request, res: Response) => {
        res.json({
            success: true,
            message: 'Tokens refreshed successfully',
            data: {
                accessToken: 'mock_access_token',
                refreshToken: 'mock_refresh_token',
            },
        });
    }),
    revokeAllTokens: vi.fn(async (req: Request, res: Response) => {
        res.json({ success: true, message: 'All tokens revoked successfully' });
    }),
}));

// Mock validation middleware
vi.mock('../../middleware/validation', () => ({
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
        auth: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
        register: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
        api: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
        search: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
        upload: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    },
}));

// Mock security middleware
vi.mock('../../middleware/security', () => ({
    configureHelmet: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    enforceHTTPS: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    detectSuspiciousActivity: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    limitRequestSize: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
    validateUserAgent: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    addCorrelationId: vi.fn((req: Request, res: Response, next: NextFunction) => next()),
    requireAPIVersion: vi.fn(() => (req: Request, res: Response, next: NextFunction) => next()),
}));

// Mock express-validator to always pass validation
vi.mock('express-validator', () => ({
    validationResult: vi.fn().mockReturnValue({
        isEmpty: () => true,
        array: () => [],
    }),
    body: vi.fn().mockReturnValue({ isLength: vi.fn().mockReturnThis(), matches: vi.fn().mockReturnThis() }),
    param: vi.fn().mockReturnValue({ isMongoId: vi.fn().mockReturnThis() }),
    query: vi.fn().mockReturnValue({ isOptional: vi.fn().mockReturnThis() }),
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
    __esModule: true,
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock external services
vi.mock('../../utils/geocodeLocation', () => ({
    __esModule: true,
    default: vi.fn().mockResolvedValue({ lat: 40.7128, lng: -74.006 }),
    geocodeAndAssignLocation: vi.fn().mockImplementation(async (body: Record<string, unknown>) => {
        if (body.address) {
            body.location = {
                type: 'Point',
                coordinates: [-74.006, 40.7128],
            };
        }
    }),
}));

// Mock TokenService
vi.mock('../../services/TokenService', () => ({
    __esModule: true,
    default: {
        generateTokenPair: vi.fn().mockResolvedValue({
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token',
        }),
        generateTokens: vi.fn().mockResolvedValue({
            accessToken: 'mock_access_token',
            refreshToken: 'mock_refresh_token',
        }),
        verifyAccessToken: vi.fn().mockResolvedValue({
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
        }),
        verifyRefreshToken: vi.fn().mockResolvedValue({
            userId: 'user123',
            email: 'test@example.com',
            role: 'user',
        }),
        blacklistToken: vi.fn().mockResolvedValue(undefined),
        revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
        isUserTokensRevoked: vi.fn().mockResolvedValue(false),
    },
}));

// Global setup and teardown
beforeEach(() => {
    vi.clearAllMocks();

    // Reset validation result mock
    const { validationResult } = require('express-validator');
    if (validationResult && typeof validationResult.mockReturnValue === 'function') {
        validationResult.mockReturnValue({
            isEmpty: () => true,
            array: () => [],
        });
    }
});

afterEach(() => {
    vi.restoreAllMocks();
});

// Export the generateValidObjectId function that's used in tests
export const generateValidObjectId = () => faker.database.mongodbObjectId();

// Export test user helper
export { createTestUser };
