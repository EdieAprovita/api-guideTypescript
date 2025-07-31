import { vi } from 'vitest';
import { faker } from '@faker-js/faker';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import testConfig from '../testConfig';

// ============================================================================
// MASTER TEST CONFIGURATION - SINGLE SOURCE OF TRUTH
// ============================================================================

// Set consistent faker seed for reproducible tests
faker.seed(12345);

let mongoServer: MongoMemoryServer;

// ============================================================================
// ENVIRONMENT SETUP
// ============================================================================

export const setupMasterTestEnvironment = (): void => {
    // Core environment variables
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'master_test_secret_key_12345';
    process.env.JWT_REFRESH_SECRET = 'master_refresh_secret_12345';
    process.env.JWT_EXPIRES_IN = '24h'; // Longer for tests
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';
    process.env.BCRYPT_SALT_ROUNDS = '4'; // Faster for tests

    // Database
    process.env.MONGODB_URI = 'mongodb://localhost:27017/master-test-db';

    // Disable external services
    process.env.REDIS_HOST = 'mock-redis-host'; // Non-existent host to prevent real connections
    process.env.REDIS_PORT = '9999'; // Non-standard port to prevent real connections
    process.env.REDIS_PASSWORD = testConfig.generateTestPassword();
    process.env.REDIS_URL = 'redis://test-mock:9999'; // Mock Redis URL
    process.env.EMAIL_USER = 'test@example.com';
    process.env.EMAIL_PASS = testConfig.generateTestPassword();
    process.env.CLIENT_URL = 'http://localhost:3000';

    // Disable MongoDB binary downloads
    process.env.MONGOMS_DISABLE_POSTINSTALL = '1';
};

// ============================================================================
// CONSISTENT MOCK SYSTEM
// ============================================================================

// Constants for consistent test data
export const TEST_CONSTANTS = {
    ADMIN_USER_ID: '507f1f77bcf86cd799439011',
    ADMIN_EMAIL: 'admin@test.com',
    ADMIN_TOKEN: 'master_test_token_12345',
    ADMIN_REFRESH_TOKEN: 'master_refresh_token_12345',
    PROFESSIONAL_USER_ID: '507f1f77bcf86cd799439012',
    PROFESSIONAL_EMAIL: 'professional@test.com',
    USER_ID: '507f1f77bcf86cd799439013',
    USER_EMAIL: 'user@test.com',
} as const;

// ============================================================================
// JWT MOCK - CONSISTENT AND WORKING
// ============================================================================

export const createMasterJWTMock = () => {
    const jwtMock = {
        sign: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
            // Return consistent token based on payload
            const userId = payload.userId || TEST_CONSTANTS.ADMIN_USER_ID;
            return `master_token_${userId}`;
        }),

        verify: vi.fn().mockImplementation((token: string) => {
            // Parse token to extract userId
            const userId = token.includes('507f1f77bcf86cd799439011')
                ? TEST_CONSTANTS.ADMIN_USER_ID
                : TEST_CONSTANTS.USER_ID;

            return {
                userId,
                email: userId === TEST_CONSTANTS.ADMIN_USER_ID ? TEST_CONSTANTS.ADMIN_EMAIL : TEST_CONSTANTS.USER_EMAIL,
                role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 86400, // 24h
            };
        }),

        decode: vi.fn().mockImplementation((token: string) => {
            return jwtMock.verify(token);
        }),
    };

    return {
        __esModule: true,
        default: jwtMock,
        ...jwtMock,
    };
};

// ============================================================================
// TOKEN SERVICE MOCK - WORKING CONSISTENTLY
// ============================================================================

export const createMasterTokenServiceMock = () => {
    const tokenServiceMock = {
        generateTokens: vi.fn().mockImplementation(async (userId: string, email: string, role: string) => {
            return {
                accessToken: `master_token_${userId}`,
                refreshToken: `master_refresh_${userId}`,
            };
        }),

        generateTokenPair: vi.fn().mockImplementation(async (payload: Record<string, unknown>) => {
            const userId = payload.userId || TEST_CONSTANTS.ADMIN_USER_ID;
            return {
                accessToken: `master_token_${userId}`,
                refreshToken: `master_refresh_${userId}`,
            };
        }),

        verifyAccessToken: vi.fn().mockImplementation(async (token: string) => {
            // Extract userId from token
            const userId = token.includes('507f1f77bcf86cd799439011')
                ? TEST_CONSTANTS.ADMIN_USER_ID
                : TEST_CONSTANTS.USER_ID;

            return {
                userId,
                email: userId === TEST_CONSTANTS.ADMIN_USER_ID ? TEST_CONSTANTS.ADMIN_EMAIL : TEST_CONSTANTS.USER_EMAIL,
                role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
            };
        }),

        verifyRefreshToken: vi.fn().mockImplementation(async (token: string) => {
            const userId = token.includes('507f1f77bcf86cd799439011')
                ? TEST_CONSTANTS.ADMIN_USER_ID
                : TEST_CONSTANTS.USER_ID;

            return {
                userId,
                email: userId === TEST_CONSTANTS.ADMIN_USER_ID ? TEST_CONSTANTS.ADMIN_EMAIL : TEST_CONSTANTS.USER_EMAIL,
                role: userId === TEST_CONSTANTS.ADMIN_USER_ID ? 'admin' : 'user',
                type: 'refresh',
            };
        }),

        refreshTokens: vi.fn().mockImplementation(async (refreshToken: string) => {
            const userId = refreshToken.includes('507f1f77bcf86cd799439011')
                ? TEST_CONSTANTS.ADMIN_USER_ID
                : TEST_CONSTANTS.USER_ID;

            return {
                accessToken: `master_token_${userId}`,
                refreshToken: `master_refresh_${userId}`,
            };
        }),

        blacklistToken: vi.fn().mockResolvedValue(undefined),
        isTokenBlacklisted: vi.fn().mockResolvedValue(false),
        revokeAllUserTokens: vi.fn().mockResolvedValue(undefined),
        isUserTokensRevoked: vi.fn().mockResolvedValue(false),
        revokeRefreshToken: vi.fn().mockResolvedValue(undefined),
        clearAllForTesting: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
    };

    return {
        __esModule: true,
        default: tokenServiceMock,
    };
};

// ============================================================================
// AUTH MIDDLEWARE MOCK - WORKING
// ============================================================================

export const createMasterAuthMiddlewareMock = () => {
    const createAuthMiddleware = (requiredRole?: 'admin' | 'professional') => {
        return vi.fn().mockImplementation((req: any, res: any, next: any) => {
            // Extract token from request
            let token: string | undefined;

            if (req.headers.authorization?.startsWith('Bearer ')) {
                token = req.headers.authorization.split(' ')[1];
            } else if (req.cookies?.jwt) {
                token = req.cookies.jwt;
            }

            // If no token and auth is required, return 401
            if (!token && requiredRole) {
                return res.status(401).json({
                    success: false,
                    message: 'Not authorized to access this route',
                });
            }

            // Set user based on token or default to admin for simplicity
            const userId = TEST_CONSTANTS.ADMIN_USER_ID; // Default to admin for tests

            req.user = {
                _id: userId,
                userId,
                username: 'testadmin',
                email: TEST_CONSTANTS.ADMIN_EMAIL,
                role: 'admin',
                isAdmin: true,
                isActive: true,
                isDeleted: false,
            };

            // Check role if required
            if (requiredRole && req.user.role !== requiredRole && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: `${requiredRole} access required`,
                });
            }

            next();
        });
    };

    const mockAsyncHandler = vi.fn().mockImplementation(async (req: any, res: any) => {
        res.status(200).json({
            success: true,
            message: 'Mock response',
        });
    });

    return {
        protect: createAuthMiddleware(),
        admin: createAuthMiddleware('admin'),
        professional: createAuthMiddleware('professional'),
        requireAuth: createAuthMiddleware(),
        checkOwnership: vi.fn(() => createAuthMiddleware()),
        logout: mockAsyncHandler,
        refreshToken: mockAsyncHandler,
        revokeAllTokens: mockAsyncHandler,
    };
};

// ============================================================================
// SETUP ALL MOCKS
// ============================================================================

export const setupAllMasterMocks = (): void => {
    // Mock JWT
    vi.mock('jsonwebtoken', () => createMasterJWTMock());

    // Mock TokenService (multiple paths to handle different import patterns)
    vi.mock('../../services/TokenService', () => createMasterTokenServiceMock());
    vi.mock('../../../services/TokenService', () => createMasterTokenServiceMock());
    vi.mock('../../../../services/TokenService', () => createMasterTokenServiceMock());

    // Mock Auth Middleware
    vi.mock('../../middleware/authMiddleware', () => createMasterAuthMiddlewareMock());
    vi.mock('../../../middleware/authMiddleware', () => createMasterAuthMiddlewareMock());

    // Mock Redis and ioredis to prevent real connections
    vi.mock('ioredis', () => {
        const mockRedis = vi.fn().mockImplementation(() => ({
            connect: vi.fn().mockResolvedValue(undefined),
            disconnect: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue('OK'),
            del: vi.fn().mockResolvedValue(1),
            exists: vi.fn().mockResolvedValue(0),
            expire: vi.fn().mockResolvedValue(1),
            ttl: vi.fn().mockResolvedValue(-1),
            keys: vi.fn().mockResolvedValue([]),
            flushdb: vi.fn().mockResolvedValue('OK'),
            ping: vi.fn().mockResolvedValue('PONG'),
            status: 'ready',
            on: vi.fn().mockReturnThis(),
            off: vi.fn().mockReturnThis(),
            emit: vi.fn().mockReturnThis(),
        }));

        return {
            __esModule: true,
            default: mockRedis,
        };
    });

    // Mock CacheService to prevent Redis connections (multiple import paths)
    vi.mock('../../services/CacheService', () => {
        const mockCacheService = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true),
            invalidate: vi.fn().mockResolvedValue(true),
            invalidatePattern: vi.fn().mockResolvedValue(true),
            invalidateByTag: vi.fn().mockResolvedValue(true),
            getStats: vi.fn().mockResolvedValue({
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: '0MB',
                uptime: 0,
            }),
            isHealthy: vi.fn().mockResolvedValue(true),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };

        return {
            __esModule: true,
            CacheService: vi.fn().mockImplementation(() => mockCacheService),
            default: mockCacheService,
            cacheService: mockCacheService, // Export as cacheService as well
        };
    });

    vi.mock('../../../services/CacheService', () => {
        const mockCacheService = {
            get: vi.fn().mockResolvedValue(null),
            set: vi.fn().mockResolvedValue(true),
            invalidate: vi.fn().mockResolvedValue(true),
            invalidatePattern: vi.fn().mockResolvedValue(true),
            invalidateByTag: vi.fn().mockResolvedValue(true),
            getStats: vi.fn().mockResolvedValue({
                hitRatio: 0,
                totalRequests: 0,
                cacheSize: 0,
                memoryUsage: '0MB',
                uptime: 0,
            }),
            isHealthy: vi.fn().mockResolvedValue(true),
            disconnect: vi.fn().mockResolvedValue(undefined),
        };

        return {
            __esModule: true,
            CacheService: vi.fn().mockImplementation(() => mockCacheService),
            default: mockCacheService,
            cacheService: mockCacheService, // Export as cacheService as well
        };
    });

    // Mock CacheAlertService (multiple import paths)
    vi.mock('../../services/CacheAlertService', () => ({
        __esModule: true,
        default: {
            checkMetrics: vi.fn().mockResolvedValue(undefined),
            isHealthy: vi.fn().mockResolvedValue(true),
        },
    }));

    vi.mock('../../../services/CacheAlertService', () => ({
        __esModule: true,
        default: {
            checkMetrics: vi.fn().mockResolvedValue(undefined),
            isHealthy: vi.fn().mockResolvedValue(true),
        },
    }));

    // Mock other middleware that might cause issues
    vi.mock('express-rate-limit', () => ({
        default: vi.fn(() => (req: any, res: any, next: any) => next()),
    }));

    // Mock validation middleware with ALL exports
    vi.mock('../../middleware/validation', () => {
        const mockValidation = (req: any, res: any, next: any) => next();

        return {
            validate: vi.fn(() => mockValidation),
            sanitizeInput: vi.fn(() => [mockValidation]), // Returns array of middlewares
            createRateLimit: vi.fn(() => mockValidation),
            rateLimits: {
                api: mockValidation,
                auth: mockValidation,
                upload: mockValidation,
                search: mockValidation,
                register: mockValidation,
            },
            handleValidationError: mockValidation,
            securityHeaders: mockValidation,
            validateInputLength: vi.fn(() => mockValidation),
        };
    });

    // Also mock the validation middleware at different import paths
    vi.mock('../../../middleware/validation', () => {
        const mockValidation = (req: any, res: any, next: any) => next();

        return {
            validate: vi.fn(() => mockValidation),
            sanitizeInput: vi.fn(() => [mockValidation]),
            createRateLimit: vi.fn(() => mockValidation),
            rateLimits: {
                api: mockValidation,
                auth: mockValidation,
                upload: mockValidation,
                search: mockValidation,
                register: mockValidation,
            },
            handleValidationError: mockValidation,
            securityHeaders: mockValidation,
            validateInputLength: vi.fn(() => mockValidation),
        };
    });
};

// ============================================================================
// DATABASE HELPERS
// ============================================================================

export const setupMasterDatabase = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            return; // Already connected
        }

        mongoServer = await MongoMemoryServer.create({
            binary: { version: '6.0.0' },
            instance: { dbName: 'master-test-db' },
        });

        const mongoUri = mongoServer.getUri();
        process.env.MONGODB_URI = mongoUri;

        await mongoose.connect(mongoUri, {
            maxPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 10000,
        });

        console.log('✅ Master test database connected');
    } catch (error) {
        console.error('❌ Master database setup failed:', error);
        throw error;
    }
};

export const teardownMasterDatabase = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }

        if (mongoServer) {
            await mongoServer.stop();
        }

        console.log('✅ Master test database disconnected');
    } catch (error) {
        console.error('❌ Master database teardown failed:', error);
    }
};

export const clearMasterDatabase = async (): Promise<void> => {
    try {
        if (mongoose.connection.readyState === 1 && mongoose.connection.db) {
            const collections = mongoose.connection.db.collections();
            for (const collection of await collections) {
                await collection.deleteMany({});
            }
        }
    } catch (error) {
        console.error('❌ Master database clear failed:', error);
    }
};

// ============================================================================
// MASTER TEST CONTEXT
// ============================================================================

export interface MasterTestContext {
    admin: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
    };
    professional: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
    };
    user: {
        userId: string;
        email: string;
        token: string;
        refreshToken: string;
    };
}

export const createMasterTestContext = (): MasterTestContext => {
    return {
        admin: {
            userId: TEST_CONSTANTS.ADMIN_USER_ID,
            email: TEST_CONSTANTS.ADMIN_EMAIL,
            token: TEST_CONSTANTS.ADMIN_TOKEN,
            refreshToken: TEST_CONSTANTS.ADMIN_REFRESH_TOKEN,
        },
        professional: {
            userId: TEST_CONSTANTS.PROFESSIONAL_USER_ID,
            email: TEST_CONSTANTS.PROFESSIONAL_EMAIL,
            token: `master_token_${TEST_CONSTANTS.PROFESSIONAL_USER_ID}`,
            refreshToken: `master_refresh_${TEST_CONSTANTS.PROFESSIONAL_USER_ID}`,
        },
        user: {
            userId: TEST_CONSTANTS.USER_ID,
            email: TEST_CONSTANTS.USER_EMAIL,
            token: `master_token_${TEST_CONSTANTS.USER_ID}`,
            refreshToken: `master_refresh_${TEST_CONSTANTS.USER_ID}`,
        },
    };
};

// ============================================================================
// UNIVERSAL MASTER SETUP
// ============================================================================

export interface MasterTestHooks {
    beforeAll: () => Promise<void>;
    afterAll: () => Promise<void>;
    beforeEach: () => Promise<MasterTestContext>;
}

export const setupMasterTest = (type: 'unit' | 'integration'): MasterTestHooks => {
    // Setup environment first
    setupMasterTestEnvironment();

    // Setup all mocks
    setupAllMasterMocks();

    if (type === 'integration') {
        return {
            beforeAll: setupMasterDatabase,
            afterAll: teardownMasterDatabase,
            beforeEach: async () => {
                await clearMasterDatabase();
                vi.clearAllMocks();
                return createMasterTestContext();
            },
        };
    }

    // Unit tests - no database
    return {
        beforeAll: async () => {},
        afterAll: async () => {},
        beforeEach: async () => {
            vi.clearAllMocks();
            return createMasterTestContext();
        },
    };
};

// ============================================================================
// SIMPLE DATA GENERATORS
// ============================================================================

export const generateMasterTestData = {
    business: (overrides: Record<string, unknown> = {}) => ({
        _id: faker.database.mongodbObjectId(),
        namePlace: faker.company.name(),
        author: TEST_CONSTANTS.ADMIN_USER_ID,
        address: faker.location.streetAddress(),
        location: {
            type: 'Point' as const,
            coordinates: [faker.location.longitude(), faker.location.latitude()],
        },
        image: faker.image.url(),
        contact: [
            {
                phone: faker.string.numeric(10),
                email: faker.internet.email(),
                facebook: faker.internet.url(),
                instagram: `@${faker.internet.userName()}`,
            },
        ],
        budget: faker.number.int({ min: 1, max: 4 }),
        typeBusiness: faker.helpers.arrayElement(['restaurant', 'cafe', 'store']),
        hours: [
            {
                dayOfWeek: 'Monday',
                openTime: '09:00',
                closeTime: '18:00',
            },
        ],
        rating: 0,
        numReviews: 0,
        reviews: [],
        ...overrides,
    }),

    user: (overrides: Record<string, unknown> = {}) => ({
        _id: faker.database.mongodbObjectId(),
        username: faker.internet.userName(),
        email: faker.internet.email(),
        role: 'user',
        isAdmin: false,
        isActive: true,
        isDeleted: false,
        photo: 'default.png',
        ...overrides,
    }),
};

// ============================================================================
// SIMPLE REQUEST HELPERS
// ============================================================================

export const makeMasterRequest = {
    get: (app: any, path: string, token?: string) => {
        const supertest = require('supertest');
        const req = supertest(app).get(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    post: (app: any, path: string, data?: any, token?: string) => {
        const supertest = require('supertest');
        const req = supertest(app).post(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        if (data) req.send(data);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    put: (app: any, path: string, data?: any, token?: string) => {
        const supertest = require('supertest');
        const req = supertest(app).put(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        if (data) req.send(data);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },

    delete: (app: any, path: string, token?: string) => {
        const supertest = require('supertest');
        const req = supertest(app).delete(path);
        if (token) req.set('Authorization', `Bearer ${token}`);
        return req.set('User-Agent', 'test-agent').set('API-Version', 'v1');
    },
};

// ============================================================================
// SIMPLE ASSERTIONS
// ============================================================================

export const expectMasterResponse = {
    success: (response: any, status = 200) => {
        expect(response.status).toBe(status);
        expect(response.body.success).toBe(true);
    },

    error: (response: any, status = 400) => {
        expect(response.status).toBe(status);
        expect(response.body.success).toBe(false);
    },

    created: (response: any) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
    },

    unauthorized: (response: any) => {
        expect(response.status).toBe(401);
    },

    forbidden: (response: any) => {
        expect(response.status).toBe(403);
    },

    notFound: (response: any) => {
        expect(response.status).toBe(404);
    },
};
