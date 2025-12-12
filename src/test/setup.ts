// Global test setup - Centralized and optimized for Vitest
import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import { Request, Response, NextFunction } from 'express';
import { generateTestPassword } from './utils/passwordGenerator.js';
import { authMiddlewareMocks, validationMocks, securityMocks, userControllerMocks } from './__mocks__/middleware.js';
import { serviceMocks, modelMocks, externalMocks } from './__mocks__/services.js';
import { dbConfigMocks } from './__mocks__/database.js';

// Mock environment variables with faker-generated values
process.env.NODE_ENV = 'test'; // Cambiar a 'test' para mejor rendimiento
process.env.JWT_SECRET = generateTestPassword();
process.env.BCRYPT_SALT_ROUNDS = '10';

// === CRITICAL: Mocks must be defined BEFORE any imports that use them ===

// Mock database connection first - prevents connection attempts
vi.mock('../config/db', () => dbConfigMocks);

// Mock auth middleware - CRITICAL for authRoutes.ts
vi.mock('../middleware/authMiddleware', () => ({
    __esModule: true,
    ...authMiddlewareMocks,
}));

// Mock validation middleware
vi.mock('../middleware/validation', () => ({
    __esModule: true,
    ...validationMocks,
}));

// Mock security middleware
vi.mock('../middleware/security', () => ({
    __esModule: true,
    ...securityMocks,
}));

// Mock user controllers (used in authRoutes)
vi.mock('../controllers/userControllers', () => ({
    __esModule: true,
    ...userControllerMocks,
}));

// Mock TokenService to prevent Redis connection issues
vi.mock('../services/TokenService', () => ({
    __esModule: true,
    default: serviceMocks.tokenService,
}));

// Do not mock CacheWarmingService globally; unit tests rely on real implementation

// Mock CacheService
vi.mock('../services/CacheService', () => ({
    __esModule: true,
    cacheService: serviceMocks.cacheService,
}));

// Mock RestaurantService
vi.mock('../services/RestaurantService', () => ({
    __esModule: true,
    restaurantService: serviceMocks.restaurantService,
}));

// Mock BusinessService
vi.mock('../services/BusinessService', () => ({
    __esModule: true,
    businessService: serviceMocks.businessService,
}));

// Do not mock GeoService here; service unit tests provide their own mocks

// Mock ReviewService
vi.mock('../services/ReviewService', () => ({
    __esModule: true,
    reviewService: serviceMocks.reviewService,
}));

// Mock User model
vi.mock('../models/User', () => ({
    __esModule: true,
    User: modelMocks.User,
    default: modelMocks.User,
}));

// Mock express-validator
vi.mock('express-validator', () => ({
    __esModule: true,
    default: {
        validationResult: vi.fn(() => ({
            isEmpty: vi.fn().mockReturnValue(true),
            array: vi.fn().mockReturnValue([]),
        })),
        body: vi.fn(() => ({
            notEmpty: vi.fn().mockReturnThis(),
            isLength: vi.fn().mockReturnThis(),
            isEmail: vi.fn().mockReturnThis(),
            escape: vi.fn().mockReturnThis(),
            trim: vi.fn().mockReturnThis(),
            normalizeEmail: vi.fn().mockReturnThis(),
        })),
    },
    validationResult: vi.fn(() => ({
        isEmpty: vi.fn().mockReturnValue(true),
        array: vi.fn().mockReturnValue([]),
    })),
    body: vi.fn(() => ({
        notEmpty: vi.fn().mockReturnThis(),
        isLength: vi.fn().mockReturnThis(),
        isEmail: vi.fn().mockReturnThis(),
        escape: vi.fn().mockReturnThis(),
        trim: vi.fn().mockReturnThis(),
        normalizeEmail: vi.fn().mockReturnThis(),
    })),
    param: vi.fn(() => ({
        isMongoId: vi.fn().mockReturnThis(),
        notEmpty: vi.fn().mockReturnThis(),
    })),
}));

// Mock cache middleware
vi.mock('../middleware/cache', () => ({
    __esModule: true,
    recipeCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    businessCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    restaurantCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    geoLocationCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    userProfileCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    searchCacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    cacheMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    cacheInvalidationMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    cacheStatsMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    cacheFlushMiddleware: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
    browserCacheValidation: vi.fn(() => (_req: Request, _res: Response, next: NextFunction) => next()),
}));

// Mock external libraries
vi.mock('jsonwebtoken', () => ({
    __esModule: true,
    default: {
        sign: vi.fn().mockReturnValue(generateTestPassword()),
        verify: vi.fn().mockReturnValue({ userId: 'someUserId' }),
    },
    sign: vi.fn().mockReturnValue(generateTestPassword()),
    verify: vi.fn().mockReturnValue({ userId: 'someUserId' }),
}));

vi.mock('bcryptjs', () => ({
    __esModule: true,
    ...externalMocks.bcrypt,
}));

// Mock logger to prevent file system operations
vi.mock('../utils/logger', () => ({
    __esModule: true,
    default: {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Global test utilities - Suppress console output in tests
global.console = {
    ...console,
    log: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: console.warn, // Keep warnings visible
    error: console.error, // Keep errors visible
};

// Setup global test hooks
beforeEach(() => {
    // Only clear mock calls, not the mock implementations
    vi.clearAllMocks();
});

afterEach(() => {
    // Clean up any test-specific changes
    vi.restoreAllMocks();
});
